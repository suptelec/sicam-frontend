import { Routes } from '@angular/router';

export const SYSTEM_SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/system-settings-page/system-settings-page')
        .then(m => m.SystemSettingsPageComponent)
  }
];