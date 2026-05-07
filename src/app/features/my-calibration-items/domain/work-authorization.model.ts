export enum CalibrationWorkAuthorizationStatus {
  Requested = 1,
  Authorized = 2,
  Rejected = 3,
  Cancelled = 4
}

export interface CreateCalibrationWorkAuthorizationRequest {
  requestedWorkDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  requestReason: string;
  requestDocumentUrl: string;
}

export interface AuthorizeCalibrationWorkAuthorizationRequest {
  authorizationMessage: string;
  authorizationDocumentUrl: string;
}

export interface RejectCalibrationWorkAuthorizationRequest {
  rejectionReason: string;
}

export interface CalibrationWorkAuthorization {
  id: number;

  calibrationPlanItemId: number;
  calibrationPlanId: number;
  planYear?: number | null;
  planName?: string | null;

  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  meterId?: number | null;
  meterCode?: string | null;
  meterSerial?: string | null;

  requestedWorkDate: string;
  requestedStartTime: string;
  requestedEndTime: string;

  requestReason: string;
  requestDocumentUrl: string;

  authorizationStatus: CalibrationWorkAuthorizationStatus;

  authorizationMessage?: string | null;
  authorizationDocumentUrl?: string | null;

  rejectionReason?: string | null;

  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;

  status: number;
  createdAt: string;
}

export interface AuthorizationMeterSnapshot {
  id: number;
  calibrationWorkAuthorizationId: number;
  notes?: string | null;
  isLocked: boolean;
  lockedAt?: string | null;
  sentToPmseAt?: string | null;
  photos: AuthorizationMeterSnapshotPhoto[];
}

export interface AuthorizationMeterSnapshotPhoto {
  id: number;
  authorizationMeterSnapshotId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  storageKey: string;
  fileUrl: string;
  caption?: string | null;
  sortOrder: number;
}

export interface CreateAuthorizationMeterSnapshotPhotoRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
  storageKey: string;
  fileUrl: string;
  caption?: string | null;
  sortOrder: number;
}