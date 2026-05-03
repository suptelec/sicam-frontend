export enum EntityStatus {
  Active = 1,
  Inactive = 2,
  Deleted = 3
}

export interface PmseLaboratory {
  id: number;

  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  accreditedLaboratoryId: number;
  accreditedLaboratoryName?: string | null;
  accreditationCode?: string | null;

  scope?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;

  contractStartDate?: string | null;
  contractNumber?: string | null;
  contractDocumentUrl?: string | null;
  notes?: string | null;

  status: EntityStatus;
  createdAt?: string | null;
}

export interface CreatePmseLaboratoryRequest {
  pmseCompanyId?: number | null;

  name: string;
  accreditationCode: string;
  scope?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;

  contractNumber?: string | null;
  contractDocumentUrl?: string | null;
  notes?: string | null;
}