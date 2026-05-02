import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const MY_SCHEDULE_SUBMISSIONS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: {
      permission: {
        resource: 'calibrationProcess',
        action: PermissionAction.Read
      }
    },
    loadComponent: () =>
      import('./pages/my-schedule-submissions-list/my-schedule-submissions-list')
        .then(m => m.MyScheduleSubmissionsListComponent)
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: {
      permission: {
        resource: 'calibrationProcess',
        action: PermissionAction.Read
      }
    },
    loadComponent: () =>
      import('./pages/my-schedule-submission-detail/my-schedule-submission-detail')
        .then(m => m.MyScheduleSubmissionDetailComponent)
  }
];