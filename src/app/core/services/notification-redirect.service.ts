import { Injectable } from '@angular/core';

import {
  NotificationType,
  SicamNotification
} from '../notifications/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationRedirectService {
  resolve(notification: SicamNotification): string | null {
    const rawUrl = notification.redirectUrl?.trim();

    if (!rawUrl) {
      return null;
    }

    const id = this.extractLastNumericSegment(rawUrl);
    const type = Number(notification.type);

    if (!id) {
      return rawUrl;
    }

    if (rawUrl.startsWith('/calibration-schedule-submissions/')) {
      return this.resolveScheduleSubmissionUrl(type, id);
    }

    if (rawUrl.startsWith('/calibration-work-authorizations/')) {
      return this.resolveWorkAuthorizationUrl(type, id);
    }

    if (rawUrl.startsWith('/calibration-process-reviews/')) {
      return `/calibration-process-reviews?processId=${id}`;
    }

    if (rawUrl.startsWith('/calibration-processes/')) {
      return `/my-calibration-processes/${id}`;
    }

    return rawUrl;
  }

  private resolveScheduleSubmissionUrl(type: number, submissionId: string): string {
    if (type === NotificationType.ScheduleSubmitted) {
      return `/schedule-submission-reviews?submissionId=${submissionId}`;
    }

    if (
      type === NotificationType.ScheduleApproved ||
      type === NotificationType.ScheduleRejected
    ) {
      return `/my-schedule-submissions?submissionId=${submissionId}`;
    }

    return `/schedule-submission-reviews?submissionId=${submissionId}`;
  }

  private resolveWorkAuthorizationUrl(type: number, authorizationId: string): string {
    if (type === NotificationType.WorkAuthorizationRequested) {
      return `/work-authorization-reviews?authorizationId=${authorizationId}`;
    }

    if (
      type === NotificationType.WorkAuthorizationApproved ||
      type === NotificationType.WorkAuthorizationRejected
    ) {
      return `/my-calibration-items?workAuthorizationId=${authorizationId}`;
    }

    return `/work-authorization-reviews?authorizationId=${authorizationId}`;
  }

  private extractLastNumericSegment(url: string): string | null {
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\/(\d+)$/);

    return match?.[1] ?? null;
  }
}