import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const COMPLIANCE_REPORTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: {
      permission: {
        resource: 'report',
        action: PermissionAction.Read
      }
    },
    loadComponent: () =>
      import('./pages/compliance-reports-page/compliance-reports-page')
        .then(m => m.ComplianceReportsPageComponent)
  }
];