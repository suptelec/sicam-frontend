import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/services/auth.service';
import { NotificationSignalRService } from '../../core/services/notification-signalr.service';

import { NotificationRedirectService } from '../../core/services/notification-redirect.service';
import {
  ImportantNotificationTypes,
  SicamNotification
} from '../../core/notifications/notification.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    DatePipe
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly notificationRedirect = inject(NotificationRedirectService);

  pageTitle = input<string>('Dashboard');
  toggleSidebar = output<void>();

  notificationsOpen = signal(false);

  constructor(
    public authService: AuthService,
    public notificationService: NotificationSignalRService
  ) {}

  ngOnInit(): void {
    void this.notificationService.initialize();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notificationsOpen()) return;

    const target = event.target as Node | null;

    if (!target) return;

    if (!this.elementRef.nativeElement.contains(target)) {
      this.notificationsOpen.set(false);
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen.update(value => !value);
  }

onNotificationClicked(notification: SicamNotification): void {
  if (!notification.isRead) {
    this.notificationService.markAsRead(notification);
  }

  this.notificationsOpen.set(false);

  const redirectUrl = this.notificationRedirect.resolve(notification);

  if (redirectUrl) {
    this.router.navigateByUrl(redirectUrl);
  }
}

isImportantNotification(notification: SicamNotification): boolean {
  return ImportantNotificationTypes.has(Number(notification.type));
}

  markAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead();
  }

  refreshNotifications(event: MouseEvent): void {
    event.stopPropagation();
    void this.notificationService.loadInitialData();
  }

  async logout(): Promise<void> {
    await this.notificationService.stopAndClear();
    this.authService.logout();
  }
}