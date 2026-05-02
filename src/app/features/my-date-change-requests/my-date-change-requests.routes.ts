import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const MY_DATE_CHANGE_REQUESTS_ROUTES: Routes = [
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
      import('./pages/my-date-change-requests-list/my-date-change-requests-list')
        .then(m => m.MyDateChangeRequestsListComponent)
  }
];