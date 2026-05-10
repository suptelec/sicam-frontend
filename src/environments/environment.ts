export const environment = {
  production: false,
  apiUrl: '/api',
  identityUrl: '/identity',
  mapboxToken: '__MAPBOX_TOKEN__',
  oidc: {
    issuer: 'https://localhost:64659/',
    redirectUri: 'http://localhost:4200/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4200/auth/logout',
    clientId: 'scm-spa',
    scope: 'openid profile offline_access scm-api',
    requireHttps: false
  }
};