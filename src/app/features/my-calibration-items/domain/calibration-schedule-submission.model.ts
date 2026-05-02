export enum CalibrationScheduleSubmissionStatus {
  Draft = 1,
  Submitted = 2,
  Approved = 3,
  Rejected = 4
}

export interface CreateCalibrationScheduleSubmissionRequest {
  calibrationPlanId: number;
  pmseCompanyId: number;
  documentUrl?: string | null;
  notes?: string | null;
}

export interface AddCalibrationScheduleSubmissionItemRequest {
  calibrationPlanItemId: number;
  accreditedLaboratoryId?: number | null;
  proposedCalibrationDate: string;
  laboratoryName?: string | null;
  notes?: string | null;
}

export interface CalibrationScheduleSubmission {
  id: number;

  calibrationPlanId: number;
  planYear: number;
  planName: string;

  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  documentUrl?: string | null;
  notes?: string | null;

  submissionStatus: CalibrationScheduleSubmissionStatus;

  submittedAt?: string | null;
  submittedBy?: string | null;

  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;

  itemsCount?: number | null;
  items?: CalibrationScheduleSubmissionItem[];

  status: number;
  createdAt: string;
}

export interface CalibrationScheduleSubmissionItem {
  id: number;

  calibrationScheduleSubmissionId: number;
  calibrationPlanItemId: number;

  meterId: number;
  meterCode: string;
  meterSerial: string;

  accreditedLaboratoryId?: number | null;
  accreditedLaboratoryName?: string | null;

  proposedCalibrationDate: string;
  laboratoryName?: string | null;
  notes?: string | null;

  status: number;
  createdAt: string;
}