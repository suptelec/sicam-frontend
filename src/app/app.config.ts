
import { MAT_PAGINATOR_DEFAULT_OPTIONS, MatPaginatorIntl } from '@angular/material/paginator';

import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/auth/services/auth.service';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: MatPaginatorIntl, useFactory: getSpanishPaginatorIntl },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor])
    ),
    provideOAuthClient(),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initialize();
    })
  ]
};

function getSpanishPaginatorIntl(): MatPaginatorIntl {
  const paginatorIntl = new MatPaginatorIntl();
  paginatorIntl.itemsPerPageLabel = 'Elementos por página:';
  paginatorIntl.nextPageLabel     = 'Siguiente';
  paginatorIntl.previousPageLabel = 'Anterior';
  paginatorIntl.firstPageLabel    = 'Primera página';
  paginatorIntl.lastPageLabel     = 'Última página';
  paginatorIntl.getRangeLabel     = (page, pageSize, length) => {
    if (length === 0) return '0 de 0';
    const start = page * pageSize + 1;
    const end   = Math.min((page + 1) * pageSize, length);
    return `${start} – ${end} de ${length}`;
  };
  return paginatorIntl;
}
