import { Injectable, signal } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurrentUser, UserPermissions } from '../../models/current-user.model';
import { AuthClaims } from '../constants/auth.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _currentUser = signal<CurrentUser | null>(null);
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
    };

    this.oauthService.configure(config);
    await this.oauthService.loadDiscoveryDocumentAndTryLogin();

    if (this.isAuthenticated()) {
      this.loadCurrentUser();
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
      permissions: this.parsePermissions(tokenClaims[AuthClaims.permissions])
    });


  }

  private parsePermissions(raw: string | undefined): UserPermissions {
      console.log('raw permissions:', raw);
    if (!raw) return {};
    try {
      const arr: string[] = JSON.parse(raw);
      const result: UserPermissions = {};
      for (const entry of arr) {
        const [key, value] = entry.split(':');
        const num = parseInt(value);
        switch (key) {
          case 'calibration_plan':    result.calibrationPlan    = num; break;
          case 'calibration_process': result.calibrationProcess = num; break;
          case 'telemetering':        result.telemetering        = num; break;
          case 'audit':               result.audit               = num; break;
          case 'company':             result.company             = num; break;
          case 'system_user':         result.systemUser          = num; break;
          case 'report':              result.report              = num; break;
        }
      }
      return result;
    } catch {
      return {};
    }
  }
}