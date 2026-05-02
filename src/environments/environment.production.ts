export const environment = {
  production: true,
  apiUrl: 'https://api.sicam.com',
  identityUrl: 'https://identity.sicam.com',
  oidc: {
    issuer: 'https://identity.sicam.com',
    redirectUri: 'https://sicam.com/auth/callback',
    postLogoutRedirectUri: 'https://sicam.com/auth/logout',
    clientId: 'scm-spa',
    scope: 'openid profile offline_access scm-api',
    requireHttps: true
  }
};