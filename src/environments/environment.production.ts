export const environment = {
  production: true,
  apiUrl: 'https://api.sicam.com',
  identityUrl: 'https://identity.sicam.com',
  oidc: {
    issuer: 'https://identity.sicam.com',
    redirectUri: 'https://sicam.com/auth/callback',
    clientId: 'scm-spa',
    scope: 'openid profile scm-api',
    requireHttps: true
  }
};