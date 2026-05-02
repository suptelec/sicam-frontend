export enum EntityStatus {
  Active = 1,
  Inactive = 2,
  Deleted = 3
}

export enum CalibrationResult {
  Approved = 1,
  Rejected = 2
}

export enum CalibrationCertificateSource {
  HistoricalLoad = 1,
  CalibrationProcess = 2,
  ExternalM2M = 3
}

export interface MeterCalibrationCertificate {
  id: number;

  meterId: number;
  meterCode?: string | null;
  meterSerial?: string | null;

  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  accreditedLaboratoryId?: number | null;
  accreditedLaboratoryName?: string | null;

  certificateNumber: string;
  secondaryCertificateNumber?: string | null;

  issueDate: string;
  validUntil: string;

  calibrationResult: CalibrationResult;
  calibrationSource: CalibrationCertificateSource;

  pdfUrl?: string | null;
  notes?: string | null;

  status: EntityStatus;
  createdAt: string;
}

export interface CreateMeterCalibrationCertificateRequest {
  meterId: number;
  accreditedLaboratoryId?: number | null;

  certificateNumber: string;
  secondaryCertificateNumber?: string | null;

  issueDate: string;
  validUntil: string;

  calibrationResult: CalibrationResult;

  pdfUrl?: string | null;
  notes?: string | null;
}

export const CalibrationResultLabels: Record<CalibrationResult, string> = {
  [CalibrationResult.Approved]: 'Aprobado',
  [CalibrationResult.Rejected]: 'Rechazado'
};

export const CalibrationCertificateSourceLabels: Record<CalibrationCertificateSource, string> = {
  [CalibrationCertificateSource.HistoricalLoad]: 'Carga histórica',
  [CalibrationCertificateSource.CalibrationProcess]: 'Proceso de calibración',
  [CalibrationCertificateSource.ExternalM2M]: 'M2M externo'
};