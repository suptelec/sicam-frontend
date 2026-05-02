import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const ACCREDITED_LABORATORIES_ROUTES: Routes = [
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
      import('./pages/accredited-laboratories-list/accredited-laboratories-list')
        .then(m => m.AccreditedLaboratoriesListComponent)
  }
];