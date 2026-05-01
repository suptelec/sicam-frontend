import { Routes } from '@angular/router';

export const SYSTEM_USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/system-users-list/system-users-list')
        .then(m => m.SystemUsersListComponent)
  }
];