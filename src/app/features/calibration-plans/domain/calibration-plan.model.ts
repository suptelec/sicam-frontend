export enum EntityStatus {
  Active = 1,
  Inactive = 2,
  Deleted = 3
}

export enum CalibrationPlanStatus {
  Draft = 1,
  Published = 2,
  InProgress = 3,
  Closed = 4,
  ForceClosed = 5
}

export interface CalibrationPlan {
  id: number;
  year: number;
  name: string;
  description?: string | null;

  startDate: string;
  endDate: string;

  planStatus: CalibrationPlanStatus;

  publishedAt?: string | null;
  publishedBy?: string | null;

  closedAt?: string | null;
  closedBy?: string | null;
  closureReason?: string | null;

  itemsCount: number;
  approvedItemsCount: number;
  pendingItemsCount: number;

  status: EntityStatus;
  createdAt: string;
}

export interface CreateCalibrationPlanRequest {
  year: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
}

export interface GenerateCalibrationPlanItemsResult {
  calibrationPlanId: number;
  planYear: number;
  candidateMetersCount: number;
  generatedItemsCount: number;
  skippedExistingItemsCount: number;
  items: GeneratedCalibrationPlanItem[];
}

export interface GeneratedCalibrationPlanItem {
  calibrationPlanItemId: number;
  meterId: number;
  meterCode: string;
  meterSerial: string;
  pmseCompanyId: number;
  pmseCompanyName: string;
  lastCertificateId: number;
  certificateNumber: string;
  lastCertificateIssueDate: string;
  lastCertificateValidUntil: string;
  plannedStartDate: string;
  plannedEndDate: string;
  scheduledDate?: string | null;
}

export interface CenaceAnnualPlanValidationResponse {
  calibrationPlanId: number;
  planYear: number;
  planName: string;
  totalItems: number;
  errorCount: number;
  warningCount: number;
  canExport: boolean;
  issues: CenaceAnnualPlanValidationIssue[];
}

export interface CenaceAnnualPlanValidationIssue {
  severity: 'ERROR' | 'WARNING' | string;
  calibrationPlanItemId: number;
  meterId: number;
  meterCode: string;
  meterSerial: string;
  pmseCompanyId: number;
  pmseCompanyName: string;
  field: string;
  message: string;
}

export const CalibrationPlanStatusLabels: Record<CalibrationPlanStatus, string> = {
  [CalibrationPlanStatus.Draft]: 'Borrador',
  [CalibrationPlanStatus.Published]: 'Publicado',
  [CalibrationPlanStatus.InProgress]: 'En proceso',
  [CalibrationPlanStatus.Closed]: 'Cerrado',
  [CalibrationPlanStatus.ForceClosed]: 'Cierre forzado'
};

export enum CalibrationPlanItemStatus {
  Pending = 1,
  DateChangeRequested = 2,
  ScheduledByPmse = 3,
  ScheduleApproved = 4,
  AuthorizationRequested = 5,
  Authorized = 6,
  InProcess = 7,
  InReview = 8,
  Approved = 9,
  Rejected = 10,
  Expired = 11
}

export interface CalibrationPlanItem {
  id: number;
  calibrationPlanId: number;

  meterId: number;
  meterCode?: string | null;
  meterSerial?: string | null;

  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  lastCertificateId?: number | null;
  certificateNumber?: string | null;
  lastCertificateIssueDate?: string | null;
  lastCertificateValidUntil?: string | null;

  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  scheduledDate?: string | null;

  itemStatus: CalibrationPlanItemStatus;

  status: EntityStatus;
  createdAt: string;
}

export const CalibrationPlanItemStatusLabels: Record<CalibrationPlanItemStatus, string> = {
  [CalibrationPlanItemStatus.Pending]: 'Pendiente',
  [CalibrationPlanItemStatus.DateChangeRequested]: 'Cambio de rango solicitado',
  [CalibrationPlanItemStatus.ScheduledByPmse]: 'Cronograma enviado',
  [CalibrationPlanItemStatus.ScheduleApproved]: 'Cronograma aprobado',
  [CalibrationPlanItemStatus.AuthorizationRequested]: 'Autorización solicitada',
  [CalibrationPlanItemStatus.Authorized]: 'Autorizado',
  [CalibrationPlanItemStatus.InProcess]: 'En proceso',
  [CalibrationPlanItemStatus.InReview]: 'En revisión',
  [CalibrationPlanItemStatus.Approved]: 'Aprobado',
  [CalibrationPlanItemStatus.Rejected]: 'Rechazado',
  [CalibrationPlanItemStatus.Expired]: 'Expirado'
};