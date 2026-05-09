export interface RegulatoryRulesSettings {
  enforceScheduleSubmissionLeadDays: boolean;
  enforceCertificateDeliveryDays: boolean;
  scheduleSubmissionLeadDays: number;
  certificateDeliveryDaysNewInstallation: number;
  certificateDeliveryDaysInOperation: number;
}

export interface UpdateRegulatoryRulesSettings {
  enforceScheduleSubmissionLeadDays: boolean;
  enforceCertificateDeliveryDays: boolean;
  scheduleSubmissionLeadDays: number;
  certificateDeliveryDaysNewInstallation: number;
  certificateDeliveryDaysInOperation: number;
}

export interface RegulatoryReportSettings {
  monthlyComplianceReportEnabled: boolean;
  annualComplianceReportEnabled: boolean;
  arcernnrToRecipients: string[];
  arcernnrCcRecipients: string[];
  monthlyReportDay: number;
  monthlyReportHour: string;
  annualReportMonth: number;
  annualReportDay: number;
  annualReportHour: string;
  reportFormat: string;
}

export interface UpdateRegulatoryReportSettings {
  monthlyComplianceReportEnabled: boolean;
  annualComplianceReportEnabled: boolean;
  arcernnrToRecipients: string[];
  arcernnrCcRecipients: string[];
  monthlyReportDay: number;
  monthlyReportHour: string;
  annualReportMonth: number;
  annualReportDay: number;
  annualReportHour: string;
  reportFormat: string;
}