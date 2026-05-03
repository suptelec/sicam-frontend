import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const CALIBRATION_PROCESS_REVIEWS_ROUTES: Routes = [
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
      import('./pages/calibration-process-reviews-list/calibration-process-reviews-list')
        .then(m => m.CalibrationProcessReviewsListComponent)
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
      import('./pages/calibration-process-review-detail/calibration-process-review-detail')
        .then(m => m.CalibrationProcessReviewDetailComponent)
  }
];