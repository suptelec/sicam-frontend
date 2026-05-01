import { UserType } from '../../../core/models/current-user.model';

export interface SystemUser {
  id:               number;
  fullName:         string;
  email:            string;
  phone?:           string;
  position?:        string;
  type:             UserType;
  pmseCompanyId?:   number;
  pmseCompany?: string;
  createdAt:        string;
}

export interface CreateCenaceUserRequest {
  username:                   string;
  email:                      string;
  name:                       string;
  lastName:                   string;
  password:                   string;
  phone?:                     string;
  position?:                  string;
  calibrationPlanPermission:    number;
  calibrationProcessPermission: number;
  telemeteringPermission:       number;
  auditPermission:              number;
  companyPermission:            number;
  systemUserPermission:         number;
  reportPermission:             number;
}

export interface CreatePmseAdminRequest {
  username:                    string;
  email:                       string;
  name:                        string;
  lastName:                    string;
  password:                    string;
  phone?:                      string;
  position?:                   string;
  pmseCompanyId:               number;
  calibrationProcessPermission: number;
  systemUserPermission:         number;
  reportPermission:             number;
}

export interface CreatePmseOperatorRequest {
  username:                    string;
  email:                       string;
  name:                        string;
  lastName:                    string;
  password:                    string;
  phone?:                      string;
  position?:                   string;
  calibrationProcessPermission: number;
  telemeteringPermission:       number;
  reportPermission:             number;
}