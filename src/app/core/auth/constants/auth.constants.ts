export const AuthClaims = {
  sub:         'sub',
  name:        'name',
  email:       'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  givenName:   'given_name',
  familyName:  'family_name',
  userType:    'scm.user_type',
  permissions: 'scm.permissions',
  pmseCompanyId: 'scm.pmse_company_id',
  pmseCompanyName: 'scm.pmse_company_name'
} as const;