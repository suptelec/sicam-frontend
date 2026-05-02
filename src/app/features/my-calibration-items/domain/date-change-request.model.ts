export enum CalibrationDateChangeRequestStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3
}

export interface CreateCalibrationDateChangeRequest {
  requestedPlannedStartDate: string;
  requestedPlannedEndDate: string;
  reason: string;
}

export interface CalibrationDateChangeRequest {
  id: number;
  calibrationPlanItemId: number;
  calibrationPlanId: number;
  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  currentPlannedStartDate: string;
  currentPlannedEndDate: string;

  requestedPlannedStartDate: string;
  requestedPlannedEndDate: string;

  reason: string;
  requestStatus: CalibrationDateChangeRequestStatus;

  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;

  createdAt: string;
}