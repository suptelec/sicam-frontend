export enum PermissionAction {
  None = 0,
  Read = 1,
  Write = 2,
  Delete = 4,
  All = Read | Write | Delete
}

export type PermissionResource =
  | 'calibrationPlan'
  | 'calibrationProcess'
  | 'telemetering'
  | 'audit'
  | 'company'
  | 'systemUser'
  | 'report'
  | 'globalConfig';

export interface PermissionRequirement {
  resource: PermissionResource;
  action: PermissionAction;
}

export type PermissionCheckMode = 'all' | 'any';

export const PermissionResourceClaimMap: Record<string, PermissionResource> = {
  calibration_plan: 'calibrationPlan',
  calibration_process: 'calibrationProcess',
  telemetering: 'telemetering',
  audit: 'audit',
  company: 'company',
  system_user: 'systemUser',
  report: 'report',
  global_config: 'globalConfig'
};