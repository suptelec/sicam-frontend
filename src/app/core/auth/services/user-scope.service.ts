import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { UserType } from '../../models/current-user.model';

@Injectable({ providedIn: 'root' })
export class UserScopeService {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  readonly isCenaceUser = computed(() => {
    return this.currentUser()?.userType === UserType.CenaceStaff;
  });

  readonly isPmseUser = computed(() => {
    const type = this.currentUser()?.userType;

    return type === UserType.PmseAdmin ||
           type === UserType.PmseOperator;
  });

  readonly pmseCompanyId = computed(() => {
    return this.currentUser()?.pmseCompanyId ?? null;
  });

  readonly pmseCompanyName = computed(() => {
    return this.currentUser()?.pmseCompanyName ?? null;
  });

  getPmseFilter(fieldName = 'PmseCompanyId'): string | null {
    const pmseCompanyId = this.pmseCompanyId();

    if (!this.isPmseUser() || !pmseCompanyId) {
      return null;
    }

    return `${fieldName} eq ${pmseCompanyId}`;
  }
}