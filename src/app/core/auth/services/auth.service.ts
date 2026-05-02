import { Injectable, signal } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurrentUser, UserPermissions } from '../../models/current-user.model';
import { AuthClaims } from '../constants/auth.constants';

import {
  PermissionResourceClaimMap
} from '../permissions/permission.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _currentUser = signal<CurrentUser | null>(null);
  private refreshTokenPromise: Promise<string | null> | null = null;
  currentUser = this._currentUser.asReadonly();

  constructor(
    private oauthService: OAuthService,
    private router: Router
  ) {}

  async initialize(): Promise<void> {
  const config: AuthConfig = {
    issuer: environment.oidc.issuer,
    redirectUri: environment.oidc.redirectUri,
    postLogoutRedirectUri: environment.oidc.postLogoutRedirectUri,
    clientId: environment.oidc.clientId,
    responseType: 'code',
    scope: environment.oidc.scope,
    requireHttps: environment.oidc.requireHttps,
    showDebugInformation: !environment.production,
    useSilentRefresh: false,
    clearHashAfterLogin: true,
    timeoutFactor: 0.75
  };

  this.oauthService.configure(config);
  this.oauthService.setupAutomaticSilentRefresh();

  await this.oauthService.loadDiscoveryDocumentAndTryLogin();

  if (this.isAuthenticated()) {
    this.loadCurrentUser();
    return;
  }

  if (this.hasRefreshToken()) {
    await this.refreshAccessToken();
  }
}

  login(): void {
    this.oauthService.initCodeFlow();
  }

  logout(): void {
    this._currentUser.set(null);
    const idToken = this.oauthService.getIdToken();
    this.oauthService.logOut({
        id_token_hint: idToken
    });
}

  isAuthenticated(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  getAccessToken(): string {
    return this.oauthService.getAccessToken();
  }
  
  private loadCurrentUser(): void {
    const accessToken = this.oauthService.getAccessToken();
    if (!accessToken) return;

    let tokenClaims: any;
    try {
      const payload = accessToken.split('.')[1];
      tokenClaims = JSON.parse(atob(payload));
    } catch (e) {
      return;
    }

    if (!tokenClaims) return;

    this._currentUser.set({
      id:          tokenClaims[AuthClaims.sub],
      userName:    tokenClaims[AuthClaims.sub],
      email:       tokenClaims[AuthClaims.email] ?? tokenClaims['email'],
      fullName:    tokenClaims[AuthClaims.name]  ?? tokenClaims[AuthClaims.sub],
      userType:    parseInt(tokenClaims[AuthClaims.userType] ?? '1'),
      permissions: this.parsePermissions(tokenClaims[AuthClaims.permissions]),
      pmseCompanyId: this.parseNullableNumber(tokenClaims[AuthClaims.pmseCompanyId]),
      pmseCompanyName: this.parseNullableString(tokenClaims[AuthClaims.pmseCompanyName])
    });


  }

  private parsePermissions(raw: unknown): UserPermissions {
    const entries = this.normalizePermissionEntries(raw);
    const result: UserPermissions = {};

    for (const entry of entries) {
      const [rawKey, rawValue] = entry.split(':', 2);

      if (!rawKey || !rawValue) continue;

      const resource = PermissionResourceClaimMap[rawKey.trim()];
      if (!resource) continue;

      const value = Number(rawValue);

      if (Number.isNaN(value)) continue;

      result[resource] = value;
    }

    return result;
  }

  private normalizePermissionEntries(raw: unknown): string[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean);
    }

    if (typeof raw !== 'string') return [];

    const value = raw.trim();

    if (!value) return [];

    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) return [];

        return parsed
          .filter(item => typeof item === 'string')
          .map(item => item.trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    }

    return [value];
  }

  hasRefreshToken(): boolean {
  return !!this.oauthService.getRefreshToken();
}

private parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

private parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = String(value).trim();

  return parsed ? parsed : null;
}

async ensureValidAccessToken(): Promise<string | null> {
  if (this.oauthService.hasValidAccessToken()) {
    return this.oauthService.getAccessToken();
  }

  if (!this.hasRefreshToken()) {
    return null;
  }

  return await this.refreshAccessToken();
}

async refreshAccessToken(): Promise<string | null> {
  if (this.refreshTokenPromise) {
    return this.refreshTokenPromise;
  }

  this.refreshTokenPromise = this.refreshAccessTokenInternal()
    .finally(() => {
      this.refreshTokenPromise = null;
    });

  return this.refreshTokenPromise;
}

private async refreshAccessTokenInternal(): Promise<string | null> {
  try {
    await this.oauthService.refreshToken();

    if (!this.oauthService.hasValidAccessToken()) {
      this._currentUser.set(null);
      return null;
    }

    this.loadCurrentUser();
    return this.oauthService.getAccessToken();
  } catch {
    this._currentUser.set(null);
    return null;
  }
}
}