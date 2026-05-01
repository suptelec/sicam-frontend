import { EcuadorRegion, PmseType, EntityStatus } from './pmse-company.enum';

export interface PmseCompany {
  id:           number;
  name:         string;
  externalCode: string;
  ruc:          string;
  type:         PmseType;
  region:       EcuadorRegion;
  phone?:       string;
  email?:       string;
  address?:     string;
  province?:    string;
  status:       EntityStatus;
  createdAt:    string;
}

export interface CreatePmseCompanyRequest {
  name:         string;
  externalCode: string;
  ruc:          string;
  type:         PmseType;
  region:       EcuadorRegion;
  phone?:       string;
  email?:       string;
  address?:     string;
  province?:    string;
}