export interface CurrentUser {
  id:          string;
  userName:    string;
  email:       string;
  fullName:    string;
  userType:    UserType;
  permissions: UserPermissions;
}

export enum UserType {
  CenaceStaff  = 1,
  PmseAdmin    = 2,
  PmseOperator = 3,
  App          = 4
}

export interface UserPermissions {
  calibrationPlan?:    number;
  calibrationProcess?: number;
  telemetering?:       number;
  audit?:              number;
  company?:            number;
  systemUser?:         number;
  report?:             number;
}