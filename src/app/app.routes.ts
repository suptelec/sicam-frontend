import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell')
            .then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'pmse-companies',
        loadChildren: () =>
          import('./features/pmse-companies/pmse-companies.routes')
            .then(m => m.PMSE_COMPANIES_ROUTES)
      },
      {
        path: 'system-users',
        loadChildren: () =>
          import('./features/system-users/system-users.routes')
            .then(m => m.SYSTEM_USERS_ROUTES)
      }
    ]
  },
  {
    path: 'auth',
    children: [
      {
        path: 'callback',
        loadComponent: () =>
          import('./core/auth/callback/callback.component')
            .then(m => m.CallbackComponent)
      },
      {
        path: 'logout',
        loadComponent: () =>
          import('./core/auth/callback/callback.component')
            .then(m => m.CallbackComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];