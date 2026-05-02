import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { TOKEN_REFRESH_RETRY } from '../auth/interceptors/auth-refresh.context';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const canRetryWithRefresh =
        error.status === 401 &&
        isApiRequest(req.url) &&
        !req.context.get(TOKEN_REFRESH_RETRY);

      if (canRetryWithRefresh) {
        return from(authService.refreshAccessToken()).pipe(
          switchMap(token => {
            if (!token) {
              authService.login();
              return throwError(() => error);
            }

            const retryReq = req.clone({
              context: req.context.set(TOKEN_REFRESH_RETRY, true),
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });

            return next(retryReq);
          }),
          catchError(refreshError => {
            authService.login();
            return throwError(() => refreshError);
          })
        );
      }

      switch (error.status) {
        case 401:
          authService.login();
          break;

        case 403:
          router.navigate(['/forbidden']);
          break;

        case 500:
          console.error('Server error:', error);
          break;
      }

      return throwError(() => error);
    })
  );
};

function isApiRequest(url: string): boolean {
  const apiUrl = environment.apiUrl.replace(/\/+$/, '');

  return url.startsWith(apiUrl) || url.includes('/api/v');
}