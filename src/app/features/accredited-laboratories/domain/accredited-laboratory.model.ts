export enum EntityStatus {
  Active = 1,
  Inactive = 2,
  Deleted = 3
}

export interface AccreditedLaboratory {
  id: number;
  name: string;
  accreditationCode: string;
  scope?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  status: EntityStatus;
  createdAt: string;
}

export interface CreateAccreditedLaboratoryRequest {
  name: string;
  accreditationCode: string;
  scope?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
}