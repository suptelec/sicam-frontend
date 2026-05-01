// external-clients.routes.ts

import { Routes } from '@angular/router';
import { ExternalClientsListComponent } from './pages/external-clients-list/external-clients-list';

export const EXTERNAL_CLIENTS_ROUTES: Routes = [
  {
    path: '',
    component: ExternalClientsListComponent
  }
];