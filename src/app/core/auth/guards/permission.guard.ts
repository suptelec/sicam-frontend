import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../permissions/permission.service';
import {
  PermissionCheckMode,
  PermissionRequirement
} from '../permissions/permission.model';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  const requiredPermission = route.data['permission'] as
    | PermissionRequirement
    | PermissionRequirement[]
    | undefined;

  const mode = (route.data['permissionMode'] ?? 'all') as PermissionCheckMode;

  if (permissionService.hasPermission(requiredPermission, mode)) {
    return true;
  }

  router.navigate(['/forbidden']);
  return false;
};