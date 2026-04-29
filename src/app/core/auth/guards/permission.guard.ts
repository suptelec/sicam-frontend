import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredPermission = route.data['permission'];

  if (!requiredPermission) return true;

  const user = authService.currentUser();
  if (!user) {
    router.navigate(['/forbidden']);
    return false;
  }

  // TODO: implementar lógica de permisos según el proyecto
  // ejemplo: return user.permissions.includes(requiredPermission);
  return true;
};