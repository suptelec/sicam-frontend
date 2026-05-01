import { Routes } from '@angular/router';

export const PMSE_COMPANIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pmse-companies-list/pmse-companies-list')
        .then(m => m.PmseCompaniesListComponent)
  }
];