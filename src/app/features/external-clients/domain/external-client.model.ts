export enum EntityStatus {
  Active = 1,
  Inactive = 2
}

export interface ExternalClient {
  id: number;
  clientId: string;
  displayName: string;
  contactEmail: string;
  publicKey: string;
  status: EntityStatus;
  clientSecret?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CreateExternalClientRequest {
  displayName: string;
  contactEmail: string;
  publicKey: string;
}