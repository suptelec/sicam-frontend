import { Injectable, signal } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurrentUser } from '../../models/current-user.model';

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
    const claims = this.oauthService.getIdentityClaims() as any;
    if (!claims) return;

    this._currentUser.set({
      id: claims['sub'],
      userName: claims['preferred_username'] ?? claims['name'],
      email: claims['email'],
      fullName: claims['name'],
    });
  }
}