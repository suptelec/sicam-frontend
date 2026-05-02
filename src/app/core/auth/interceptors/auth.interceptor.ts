import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (!isApiRequest(req.url)) {
    return next(req);
  }

  return from(authService.ensureValidAccessToken()).pipe(
    switchMap(token => {
      if (!token) {
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next(authReq);
    })
  );
};

function isApiRequest(url: string): boolean {
  const apiUrl = environment.apiUrl.replace(/\/+$/, '');

  return url.startsWith(apiUrl) || url.includes('/api/v');
}