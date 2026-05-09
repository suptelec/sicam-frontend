export enum CalibrationProcessStatus {
  Draft = 1,
  InProcess = 2,
  Submitted = 3,
  Approved = 4,
  Rejected = 5,
  Corrected = 6
}

export enum CalibrationResult {
  Approved = 1,
  Rejected = 2
}

export enum CalibrationInstallationCondition {
  InOperation = 1,
  NewInstallation = 2
}

export enum MeterSnapshotReviewStatus {
  Pending = 1,
  MatchesReference = 2,
  DoesNotMatchReference = 3
}

export interface SaveMeterSnapshotReviewRequest {
  reviewStatus: MeterSnapshotReviewStatus;
  notes?: string | null;
}

export interface MeterSnapshotReview {
  id: number;
  calibrationProcessId: number;
  authorizationMeterSnapshotId: number;
  reviewStatus: MeterSnapshotReviewStatus;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface CreateCalibrationProcessRequest {
  executionDate: string;
  notes?: string | null;
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
  installationCondition: CalibrationInstallationCondition;

  certificateNumber?: string | null;
  certificateIssueDate?: string | null;
  certificateValidUntil?: string | null;

  
  calibrationResult?: CalibrationResult | null;
  certificatePdfUrl?: string | null;
  calibrationActUrl?: string | null;
  
  processStatus: CalibrationProcessStatus;

  notes?: string | null;


  documents?: CalibrationProcessDocument[];
  events?: CalibrationProcessEvent[];

  status: number;
  createdAt: string;
  startedAt?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
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
  certificateNumber: string;
  certificateIssueDate: string;
  certificateValidUntil: string;
  calibrationResult: CalibrationResult;
  notes?: string | null;
}

export enum MeterCalibrationActaCheckResult {
  Pending = 1,
  Yes = 2,
  No = 3,
  NotApplicable = 4
}

export enum MeterCalibrationActaCheckSource {
  Manual = 1,
  System = 2
}

export enum MeterSealType {
  MainMeter = 1,
  TerminalBlock = 2,
  Cabinet = 3,
  CommunicationModule = 4,
  Other = 99
}

export interface MeterCalibrationActaFormResponse {
  calibrationProcessId: number;
  calibrationPlanItemId: number;
  calibrationWorkAuthorizationId: number;

  pmseCompanyName?: string | null;
  meterSerial?: string | null;
  meterCode?: string | null;
  externalMeasurementPointCode?: string | null;

  suggestedActaDate?: string | null;

  authorizationStatus?: number | null;
  authorizationReviewedAt?: string | null;
  authorizationReviewedBy?: string | null;

  hasAuthorizedWork: boolean;
  hasAuthorizationMeterSnapshotPhotos: boolean;

  systemChecks: MeterCalibrationActaCheck[];

  existingActa?: MeterCalibrationActa | null;
}

export interface MeterCalibrationActa {
  id: number;
  calibrationProcessId: number;

  pmseTechnicalDelegateName?: string | null;
  pmsePhone?: string | null;

  actaDate?: string | null;
  calibrationStartDateTime?: string | null;

  activeEnergyEndDateTime?: string | null;
  activeEnergyEventualities?: string | null;

  reactiveEnergyEndDateTime?: string | null;
  reactiveEnergyEventualities?: string | null;

  meterRestorationEndDateTime?: string | null;

  generatedFileName?: string | null;
  generatedFileUrl?: string | null;

  checks: MeterCalibrationActaCheck[];
  seals: MeterCalibrationActaSeal[];
}

export interface MeterCalibrationActaCheck {
  id?: number | null;
  checkCode: number;
  checkResult: MeterCalibrationActaCheckResult;
  observation?: string | null;
  source?: MeterCalibrationActaCheckSource | null;
  sourceDescription?: string | null;
  capturedAt?: string | null;
}

export interface MeterCalibrationActaSeal {
  id?: number | null;
  sealType: MeterSealType | number;
  sealCode: string;
  sealLocation?: string | null;
  installedAt?: string | null;
  observations?: string | null;
  photos?: MeterCalibrationActaSealPhoto[];
}

export interface MeterCalibrationActaSealPhoto {
  id: number;
  meterCalibrationActaSealId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  storageKey: string;
  fileUrl: string;
  caption?: string | null;
  sortOrder: number;
}

export interface SaveMeterCalibrationActaRequest {
  pmseTechnicalDelegateName: string;
  pmsePhone?: string | null;
  actaDate: string;
  calibrationStartDateTime: string;
  activeEnergyEndDateTime?: string | null;
  activeEnergyEventualities?: string | null;
  reactiveEnergyEndDateTime?: string | null;
  reactiveEnergyEventualities?: string | null;
  meterRestorationEndDateTime?: string | null;
  checks: SaveMeterCalibrationActaCheckRequest[];
  seals: SaveMeterCalibrationActaSealRequest[];
}

export interface SaveMeterCalibrationActaCheckRequest {
  checkCode: number;
  checkResult: MeterCalibrationActaCheckResult;
  observation?: string | null;
}

export interface SaveMeterCalibrationActaSealRequest {
  id?: number | null;
  sealType: MeterSealType | number;
  sealCode: string;
  sealLocation?: string | null;
  installedAt?: string | null;
  observations?: string | null;
}

export interface CreateMeterCalibrationActaSealPhotoRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
  storageKey: string;
  fileUrl: string;
  caption?: string | null;
  sortOrder: number;
}

export const MeterSealTypeOptions = [
  {
    value: MeterSealType.MainMeter,
    label: 'Medidor'
  },
  {
    value: MeterSealType.TerminalBlock,
    label: 'Bornera'
  }
] as const;