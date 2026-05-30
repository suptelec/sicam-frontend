export const environment = {
  production: true,
  apiUrl: 'https://sicam-api.codeleck.com/api',
  identityUrl: 'https://sicam-identity.codeleck.com',
  mapboxToken: '__MAPBOX_TOKEN__',
  oidc: {
    issuer: 'https://sicam-identity.codeleck.com/',
    redirectUri: 'https://sicam.codeleck.com/auth/callback',
    postLogoutRedirectUri: 'https://sicam.codeleck.com/auth/logout',
    clientId: 'scm-spa',
    scope: 'openid profile offline_access scm-api',
    requireHttps: true
  }
};