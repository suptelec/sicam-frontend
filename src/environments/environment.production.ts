export const environment = {
  production: true,
  apiUrl: 'https://sicam-backend-20260503-2101.onrender.com/api/v1',
  identityUrl: 'https://identity-20260503-2125.onrender.com',
  oidc: {
    issuer: 'https://identity-20260503-2125.onrender.com/',
    redirectUri: 'https://sicam-frontend.onrender.com/auth/callback',
    postLogoutRedirectUri: 'https://sicam-frontend.onrender.com/auth/logout',
    clientId: 'scm-spa',
    scope: 'openid profile offline_access scm-api',
    requireHttps: true
  }
};