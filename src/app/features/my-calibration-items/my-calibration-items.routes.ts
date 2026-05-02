import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const MY_CALIBRATION_ITEMS_ROUTES: Routes = [
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
      import('./pages/my-calibration-items-list/my-calibration-items-list')
        .then(m => m.MyCalibrationItemsListComponent)
  }
];