export const AuthClaims = {
  sub:       'sub',
  name:      'name',
  email:     'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  givenName: 'given_name',
  familyName: 'family_name',
  role:      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  // Claims custom de SICAM — TODO: mover al proyecto cuando arranque SICAM
  applicationType: 'scm.application_type',
} as const;