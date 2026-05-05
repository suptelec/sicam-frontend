import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { SicamNotification } from '../notifications/notification.model';
import { NotificationsService } from './notifications.service';

@Injectable({ providedIn: 'root' })
export class NotificationSignalRService {
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly zone = inject(NgZone);

  private connection: signalR.HubConnection | null = null;
  private initializePromise: Promise<void> | null = null;
  private startPromise: Promise<void> | null = null;

  private readonly _notifications = signal<SicamNotification[]>([]);
  private readonly _unreadCount = signal(0);
  private readonly _isConnected = signal(false);
  private readonly _isLoading = signal(false);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly isConnected = this._isConnected.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly hasUnread = computed(() => this._unreadCount() > 0);

  async initialize(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      await this.stopAndClear();
      return;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.initializeInternal()
      .finally(() => {
        this.initializePromise = null;
      });

    return this.initializePromise;
  }

  async startConnection(): Promise<void> {
    if (!this.authService.isAuthenticated()) return;

    if (this.startPromise) {
      return this.startPromise;
    }

    if (
      this.connection &&
      this.connection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }

    const token = await this.authService.ensureValidAccessToken();

    if (!token) {
      await this.stopAndClear();
      return;
    }

    const hubUrl = this.buildHubUrl();

    if (!environment.production) {
      console.info('SignalR notifications hub url:', hubUrl);
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          const currentToken = await this.authService.ensureValidAccessToken();
          return currentToken ?? '';
        }
      })
      .withAutomaticReconnect()
      .configureLogging(
        environment.production
          ? signalR.LogLevel.Warning
          : signalR.LogLevel.Information
      )
      .build();

    this.registerHandlers(this.connection);

    this.startPromise = this.connection
      .start()
      .then(() => {
        this.zone.run(() => {
          this._isConnected.set(true);
        });

        if (!environment.production) {
          console.info('SignalR notifications connected');
        }
      })
      .catch(error => {
        this.zone.run(() => {
          this._isConnected.set(false);
        });

        if (!environment.production) {
          console.error('SignalR notifications connection failed:', error);
        }
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  async stop(): Promise<void> {
    const currentConnection = this.connection;

    this.connection = null;
    this.startPromise = null;
    this.initializePromise = null;

    this._isConnected.set(false);

    if (!currentConnection) return;

    try {
      currentConnection.off('notificationReceived');
      await currentConnection.stop();
    } catch (error) {
      if (!environment.production) {
        console.warn('SignalR notifications stop failed:', error);
      }
    }
  }

  async stopAndClear(): Promise<void> {
    await this.stop();
    this.clear();
  }

  loadInitialData(): Promise<void> {
    this._isLoading.set(true);

    return Promise.all([
      this.loadNotifications(),
      this.loadUnreadCount()
    ])
      .then(() => undefined)
      .finally(() => {
        this._isLoading.set(false);
      });
  }

  markAsRead(notification: SicamNotification): void {
    if (notification.isRead) return;

    this.updateNotificationReadState(notification.id, true);
    this.decrementUnreadCount();

    this.notificationsService.markAsRead(notification.id).subscribe({
      error: () => {
        this.updateNotificationReadState(notification.id, false);
        this.incrementUnreadCount();
      }
    });
  }

  markAllAsRead(): void {
    const currentUnread = this._unreadCount();

    if (currentUnread <= 0) return;

    const previousNotifications = this._notifications();

    this._notifications.set(
      previousNotifications.map(notification => ({
        ...notification,
        isRead: true
      }))
    );

    this._unreadCount.set(0);

    this.notificationsService.markAllAsRead().subscribe({
      error: () => {
        this._notifications.set(previousNotifications);
        this._unreadCount.set(currentUnread);
      }
    });
  }

  clear(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._isConnected.set(false);
    this._isLoading.set(false);
  }

  private async initializeInternal(): Promise<void> {
    await this.loadInitialData();
    await this.startConnection();
  }

  private registerHandlers(connection: signalR.HubConnection): void {
    connection.off('notificationReceived');

    connection.on('notificationReceived', (payload: SicamNotification) => {
      this.zone.run(() => {
        this.addOrUpdateNotification(payload);
      });
    });

    connection.onreconnecting(() => {
      this.zone.run(() => {
        this._isConnected.set(false);
      });
    });

    connection.onreconnected(() => {
      this.zone.run(() => {
        this._isConnected.set(true);
      });

      void this.loadInitialData();
    });

    connection.onclose(error => {
      this.zone.run(() => {
        this._isConnected.set(false);
      });

      if (error && !environment.production) {
        console.warn('SignalR notifications closed with error:', error);
      }
    });
  }

  private addOrUpdateNotification(notification: SicamNotification): void {
    if (!notification || !notification.id) return;

    const current = this._notifications();
    const existingIndex = current.findIndex(item => item.id === notification.id);

    if (existingIndex >= 0) {
      const previous = current[existingIndex];

      const updated = [...current];
      updated[existingIndex] = {
        ...previous,
        ...notification
      };

      this._notifications.set(updated);

      if (previous.isRead && !notification.isRead) {
        this.incrementUnreadCount();
      }

      return;
    }

    this._notifications.set([notification, ...current]);

    if (!notification.isRead) {
      this.incrementUnreadCount();
    }
  }

  private loadNotifications(): Promise<void> {
    return new Promise(resolve => {
      this.notificationsService.getMyNotifications().subscribe({
        next: response => {
          if (response.succeed) {
            this._notifications.set(response.result ?? []);
          }

          resolve();
        },
        error: (_error: HttpErrorResponse) => {
          resolve();
        }
      });
    });
  }

  private loadUnreadCount(): Promise<void> {
    return new Promise(resolve => {
      this.notificationsService.getUnreadCount().subscribe({
        next: response => {
          if (response.succeed) {
            this._unreadCount.set(Number(response.result ?? 0));
          }

          resolve();
        },
        error: (_error: HttpErrorResponse) => {
          resolve();
        }
      });
    });
  }

  private updateNotificationReadState(notificationId: number, isRead: boolean): void {
    this._notifications.set(
      this._notifications().map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead }
          : notification
      )
    );
  }

  private incrementUnreadCount(): void {
    this._unreadCount.update(value => value + 1);
  }

  private decrementUnreadCount(): void {
    this._unreadCount.update(value => Math.max(value - 1, 0));
  }

  private buildHubUrl(): string {
    const apiUrl = environment.apiUrl?.replace(/\/+$/, '') ?? '';

    if (!apiUrl || apiUrl === '/api' || apiUrl === '/api/v1') {
      return '/hubs/notifications';
    }

    if (apiUrl.endsWith('/api/v1')) {
      return `${apiUrl.slice(0, -7)}/hubs/notifications`;
    }

    if (apiUrl.endsWith('/api')) {
      return `${apiUrl.slice(0, -4)}/hubs/notifications`;
    }

    return `${apiUrl}/hubs/notifications`;
  }
}