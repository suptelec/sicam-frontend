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
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes')
            .then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'pmse-companies',
        loadChildren: () =>
          import('./features/pmse-companies/pmse-companies.routes')
            .then(m => m.PMSE_COMPANIES_ROUTES)
      },     
      {
        path: 'external-clients',
        loadChildren: () =>
          import('./features/external-clients/external-clients.routes')
            .then(m => m.EXTERNAL_CLIENTS_ROUTES)
      },
      {
        path: 'accredited-laboratories',
        loadChildren: () =>
          import('./features/accredited-laboratories/accredited-laboratories.routes')
            .then(m => m.ACCREDITED_LABORATORIES_ROUTES)
      },
      {
        path: 'meters',
        loadChildren: () =>
          import('./features/meters/meters.routes')
            .then(m => m.METERS_ROUTES)
      },
      {
        path: 'meter-calibration-certificates',
        loadChildren: () =>
          import('./features/meter-calibration-certificates/meter-calibration-certificates.routes')
            .then(m => m.METER_CALIBRATION_CERTIFICATES_ROUTES)
      },
       {
        path: 'system-users',
        loadChildren: () =>
          import('./features/system-users/system-users.routes')
            .then(m => m.SYSTEM_USERS_ROUTES)
      },
      {
        path: 'calibration-plans',
        loadChildren: () =>
          import('./features/calibration-plans/calibration-plans.routes')
            .then(m => m.CALIBRATION_PLANS_ROUTES)
      },
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