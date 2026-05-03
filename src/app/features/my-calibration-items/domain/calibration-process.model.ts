export enum CalibrationProcessStatus {
  Draft = 1,
  InProcess = 2,
  Submitted = 3,
  Approved = 4,
  Rejected = 5,
  Corrected = 6,
}

export enum CalibrationResult {
  Approved = 1,
  Rejected = 2,
}

export interface CreateCalibrationProcessRequest {
  executionDate: string;
  certificateNumber: string;
  certificateIssueDate: string;
  certificateValidUntil: string;
  calibrationResult: CalibrationResult;
  notes?: string | null;
  mainMeterSealAfterCalibration?: string | null;
  terminalBlockSealOneAfterCalibration?: string | null;
  terminalBlockSealTwoAfterCalibration?: string | null;
}

export interface CalibrationProcess {
  id: number;
  calibrationPlanItemId: number;
  calibrationPlanId: number;
  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  meterId: number;
  meterCode?: string | null;
  meterSerial?: string | null;

  accreditedLaboratoryId?: number | null;
  accreditedLaboratoryName?: string | null;
  laboratoryName?: string | null;

  executionDate: string;

  certificateNumber: string;
  certificateIssueDate: string;
  certificateValidUntil: string;

  calibrationResult: CalibrationResult;
  processStatus: CalibrationProcessStatus;

  notes?: string | null;

  mainMeterSealAfterCalibration?: string | null;
  terminalBlockSealOneAfterCalibration?: string | null;
  terminalBlockSealTwoAfterCalibration?: string | null;

  documents?: CalibrationProcessDocument[];

  events?: CalibrationProcessEvent[];

  status: number;
  createdAt: string;
}

export enum CalibrationProcessDocumentType {
  CalibrationCertificate = 1,
  CalibrationAct = 2
}

export interface CreateCalibrationProcessDocumentRequest {
  documentType: CalibrationProcessDocumentType;
  fileName: string;
  fileUrl: string;
  contentType: string;
  description?: string | null;
}

export interface CalibrationProcessDocument {
  id: number;
  calibrationProcessId: number;
  documentType: CalibrationProcessDocumentType;
  fileName: string;
  fileUrl: string;
  contentType: string;
  description?: string | null;
  status: number;
  createdAt: string;
}

export enum CalibrationProcessEventType {
  CalibrationExecuted = 6,
  CorrectionRegistered = 7
}

export interface CreateCalibrationProcessEventRequest {
  eventType: CalibrationProcessEventType;
  description: string;
  occurredAt: string;
  attachmentUrl?: string | null;
}

export interface CalibrationProcessEvent {
  id: number;
  calibrationProcessId: number;
  eventType: CalibrationProcessEventType;
  description: string;
  occurredAt: string;
  attachmentUrl?: string | null;
  status: number;
  createdAt: string;
}

export interface ApproveCalibrationProcessRequest {
  comments: string;
}

export interface RejectCalibrationProcessRequest {
  rejectionReason: string;
}

export interface StartCalibrationProcessCorrectionRequest {
  correctionNotes: string;
}

export interface UpdateCalibrationProcessDataRequest {
  accreditedLaboratoryId: number;
  executionDate: string;
  laboratoryName?: string | null;
  certificateNumber: string;
  certificateIssueDate: string;
  certificateValidUntil: string;
  calibrationResult: CalibrationResult;
  notes?: string | null;
  mainMeterSealAfterCalibration?: string | null;
  terminalBlockSealOneAfterCalibration?: string | null;
  terminalBlockSealTwoAfterCalibration?: string | null;
}