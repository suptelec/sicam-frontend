import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/guards/permission.guard';
import { PermissionAction } from '../../core/auth/permissions/permission.model';

export const WORK_AUTHORIZATION_REVIEWS_ROUTES: Routes = [
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
      import('./pages/work-authorization-reviews-list/work-authorization-reviews-list')
        .then(m => m.WorkAuthorizationReviewsListComponent)
  }
];