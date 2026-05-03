import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const MY_CALIBRATION_PROCESSES_ROUTES: Routes = [
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
      import('./pages/my-calibration-process-detail/my-calibration-process-detail')
        .then(m => m.MyCalibrationProcessDetailComponent)
  }
];