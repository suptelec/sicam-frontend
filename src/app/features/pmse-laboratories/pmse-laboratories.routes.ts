import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const PMSE_LABORATORIES_ROUTES: Routes = [
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
      import('./pages/pmse-laboratories-list/pmse-laboratories-list')
        .then(m => m.PmseLaboratoriesListComponent)
  }
];