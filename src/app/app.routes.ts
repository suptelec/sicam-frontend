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
      // TODO: agregar features del proyecto aquí
      // {
      //   path: 'calibration',
      //   loadChildren: () =>
      //     import('./features/calibration/calibration.routes')
      //       .then(m => m.CALIBRATION_ROUTES)
      // }
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