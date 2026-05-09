export enum ComplianceReportType {
  Monthly = 1,
  Annual = 2
}

export enum ComplianceStatus {
  OnTime = 1,
  Late = 2,
  NotCompleted = 3,
  PendingReview = 4,
  NotEvaluated = 5,
  NotDue = 6
}

export enum CalibrationInstallationCondition {
  InOperation = 1,
  NewInstallation = 2
}

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

export enum CalibrationProcessStatus {
  Draft = 1,
  InProcess = 2,
  Submitted = 3,
  Approved = 4,
  Rejected = 5,
  Corrected = 6
}

export interface ComplianceReportSummary {
  totalItems: number;
  dueItems: number;
  onTimeItems: number;
  lateItems: number;
  notCompletedItems: number;
  pendingReviewItems: number;
  notEvaluatedItems: number;
  notDueItems: number;
  completionPercentage: number;
  onTimePercentage: number;
}

export interface ComplianceReportPmseSummary extends ComplianceReportSummary {
  pmseCompanyId: number;
  pmseCompanyName: string;
}

export interface ComplianceReportRow {
  calibrationPlanId: number;
  planYear: number;
  calibrationPlanItemId: number;

  pmseCompanyId: number;
  pmseCompanyName: string;

  meterId: number;
  meterCode: string;
  meterSerial: string;
  meterCenaceCode?: string | null;
  meterTplCode?: string | null;

  installationCondition: CalibrationInstallationCondition;

  plannedStartDate: string;
  plannedEndDate: string;
  scheduledDate?: string | null;

  executionDate?: string | null;
  certificateDeliveryDate?: string | null;
  certificateDeadlineDate?: string | null;

  differenceDays?: number | null;
  isCertificateDeliveryLate: boolean;

  complianceStatus: ComplianceStatus;
  complianceStatusLabel: string;
  complianceDetail?: string | null;

  planItemStatus: CalibrationPlanItemStatus;
  calibrationProcessStatus?: CalibrationProcessStatus | null;

  calibrationProcessId?: number | null;

  certificateNumber?: string | null;
  laboratoryName?: string | null;

  startedAt?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;

  rejectionReason?: string | null;
}

export interface ComplianceReportResponse {
  reportType: ComplianceReportType;
  year: number;
  month?: number | null;
  from: string;
  to: string;
  generatedAt: string;

  enforceCertificateDeliveryDays: boolean;
  certificateDeliveryDaysNewInstallation: number;
  certificateDeliveryDaysInOperation: number;

  summary: ComplianceReportSummary;
  pmseSummaries: ComplianceReportPmseSummary[];
  rows: ComplianceReportRow[];
}