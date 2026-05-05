import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResult, EmptyResult } from '../../shared/models/api-result.model';
import { SicamNotification } from '../notifications/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${environment.apiUrl}/v1/Notifications`;
  }

  getMyNotifications(): Observable<ApiResult<SicamNotification[]>> {
    return this.http.get<ApiResult<SicamNotification[]>>(`${this.baseUrl}/my`);
  }

  getUnreadCount(): Observable<ApiResult<number>> {
    return this.http.get<ApiResult<number>>(`${this.baseUrl}/unread-count`);
  }

  markAsRead(notificationId: number): Observable<EmptyResult> {
    return this.http.patch<EmptyResult>(
      `${this.baseUrl}/${notificationId}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<EmptyResult> {
    return this.http.patch<EmptyResult>(
      `${this.baseUrl}/read-all`,
      {}
    );
  }
}