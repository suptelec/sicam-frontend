export const environment = {
  production: false,
  apiUrl: '/api',
  identityUrl: '/identity',
  oidc: {
    issuer: 'https://localhost:64659/',
    redirectUri: 'http://localhost:4200/auth/callback',
    clientId: 'scm-spa',
    scope: 'openid profile scm-api',
    requireHttps: false
  }
};