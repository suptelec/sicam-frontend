import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const METERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: {
      anyPermission: [
        {
          resource: 'calibrationPlan',
          action: PermissionAction.Read
        },
        {
          resource: 'calibrationProcess',
          action: PermissionAction.Read
        }
      ]
    },
    loadComponent: () =>
      import('./pages/meters-list/meters-list')
        .then(m => m.MetersListComponent)
  }
];