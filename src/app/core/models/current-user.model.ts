import { PermissionResource } from '../auth/permissions/permission.model';

export interface CurrentUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  userType: UserType;
  permissions: UserPermissions;
  pmseCompanyId?: number | null;
  pmseCompanyName?: string | null;
}

export enum UserType {
  CenaceStaff = 1,
  PmseAdmin = 2,
  PmseOperator = 3,
  App = 4
}

export type UserPermissions = Partial<Record<PermissionResource, number>>;