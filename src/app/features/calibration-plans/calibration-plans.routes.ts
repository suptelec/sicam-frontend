import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const CALIBRATION_PLANS_ROUTES: Routes = [
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
      import('./pages/calibration-plans-list/calibration-plans-list')
        .then(m => m.CalibrationPlansListComponent)
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
      import('./pages/calibration-plan-detail/calibration-plan-detail')
        .then(m => m.CalibrationPlanDetailComponent)
  }
];