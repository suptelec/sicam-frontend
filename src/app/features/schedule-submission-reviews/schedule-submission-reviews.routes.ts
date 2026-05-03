import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const SCHEDULE_SUBMISSION_REVIEWS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: {
      permission: {
        resource: 'calibrationPlan',
        action: PermissionAction.Read
      }
    },
    loadComponent: () =>
      import('./pages/schedule-submission-reviews-list/schedule-submission-reviews-list')
        .then(m => m.ScheduleSubmissionReviewsListComponent)
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: {
      permission: {
        resource: 'calibrationPlan',
        action: PermissionAction.Read
      }
    },
    loadComponent: () =>
      import('./pages/schedule-submission-review-detail/schedule-submission-review-detail')
        .then(m => m.ScheduleSubmissionReviewDetailComponent)
  }
];