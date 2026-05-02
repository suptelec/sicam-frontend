import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import {
  PermissionAction,
  PermissionCheckMode,
  PermissionRequirement,
  PermissionResource
} from './permission.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  hasPermission(
    requirement: PermissionRequirement | PermissionRequirement[] | null | undefined,
    mode: PermissionCheckMode = 'all'
  ): boolean {
    if (!requirement) return true;

    const requirements = Array.isArray(requirement)
      ? requirement
      : [requirement];

    if (requirements.length === 0) return true;

    return mode === 'all'
      ? requirements.every(item => this.hasSinglePermission(item))
      : requirements.some(item => this.hasSinglePermission(item));
  }

  hasResourcePermission(
    resource: PermissionResource,
    action: PermissionAction
  ): boolean {
    return this.hasSinglePermission({ resource, action });
  }

  private hasSinglePermission(requirement: PermissionRequirement): boolean {
    const user = this.authService.currentUser();

    if (!user) return false;

    const permissionValue = user.permissions[requirement.resource] ?? PermissionAction.None;

    if (requirement.action === PermissionAction.None) {
      return true;
    }

    return (permissionValue & requirement.action) === requirement.action;
  }
}