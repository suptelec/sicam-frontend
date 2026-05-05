export enum NotificationType {
  AnnualPlanPublished = 1,

  ScheduleSubmitted = 2,
  ScheduleApproved = 3,
  ScheduleRejected = 4,

  WorkAuthorizationRequested = 5,
  WorkAuthorizationApproved = 6,
  WorkAuthorizationRejected = 7,

  CalibrationProcessStarted = 8,

  CalibrationProcessSubmittedForReview = 9,
  CalibrationProcessApproved = 10,
  CalibrationProcessRejected = 11
}

export interface SicamNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType | number;
  redirectUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const ImportantNotificationTypes = new Set<number>([
  NotificationType.ScheduleRejected,
  NotificationType.WorkAuthorizationRejected,
  NotificationType.CalibrationProcessRejected
]);