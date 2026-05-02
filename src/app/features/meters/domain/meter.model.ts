export enum EntityStatus {
  Active = 1,
  Inactive = 2,
  Deleted = 3
}

export enum InstallationType {
  Central = 1,
  Subestacion = 2,
  Empresa = 3
}

export enum MeterRequirementType {
  Obligatorio = 1,
  Redundante = 2
}

export interface Meter {
  id: number;

  pmseCompanyId: number;
  pmseCompanyName?: string | null;

  code: string;
  tplCode?: string | null;
  cenaceCode?: string | null;
  serial: string;

  installationType?: InstallationType | null;
  requirementType?: MeterRequirementType | null;
  isPartOfSni?: boolean | null;

  measurementPointCode?: string | null;
  measurementPointWbCode?: string | null;
  borderPointCode?: string | null;

  isPrincipal: boolean;
  principalCode?: string | null;

  brand?: string | null;
  model?: string | null;
  accuracyClass?: string | null;
  nominalKv?: number | null;

  tcRatio?: string | null;
  tpRatio?: string | null;
  tcSecondaryRatio?: string | null;
  tpSecondaryRatio?: string | null;

  province?: string | null;
  sector?: string | null;
  address?: string | null;
  installationLocation?: string | null;
  installationName?: string | null;
  installationDescription?: string | null;

  latitude?: number | null;
  longitude?: number | null;
  reference?: string | null;

  gateway?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  subnetMask?: string | null;
  switchLanPort?: string | null;
  networkType?: string | null;
  activeMeter?: string | null;
  activeRouter?: string | null;
  batteryLevelPercent?: string | null;

  mainMeterSeal?: string | null;
  terminalBlockSealOne?: string | null;
  terminalBlockSealTwo?: string | null;

  pictureUrl?: string | null;
  currentCertificateUrl?: string | null;

  lastCalibrationDate?: string | null;
  nextCalibrationDate?: string | null;

  status: EntityStatus;
  createdAt: string;
}

export interface CreateMeterRequest {
  pmseCompanyId: number;

  code: string;
  tplCode?: string | null;
  cenaceCode?: string | null;
  serial: string;

  installationType?: InstallationType | null;
  requirementType?: MeterRequirementType | null;
  isPartOfSni?: boolean | null;

  measurementPointCode?: string | null;
  measurementPointWbCode?: string | null;
  borderPointCode?: string | null;

  isPrincipal: boolean;
  principalCode?: string | null;

  brand?: string | null;
  model?: string | null;
  accuracyClass?: string | null;
  nominalKv?: number | null;

  tcRatio?: string | null;
  tpRatio?: string | null;
  tcSecondaryRatio?: string | null;
  tpSecondaryRatio?: string | null;

  province?: string | null;
  sector?: string | null;
  address?: string | null;
  installationLocation?: string | null;
  installationName?: string | null;
  installationDescription?: string | null;

  latitude?: number | null;
  longitude?: number | null;
  reference?: string | null;

  gateway?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  subnetMask?: string | null;
  switchLanPort?: string | null;
  networkType?: string | null;
  activeMeter?: string | null;
  activeRouter?: string | null;
  batteryLevelPercent?: string | null;

  mainMeterSeal?: string | null;
  terminalBlockSealOne?: string | null;
  terminalBlockSealTwo?: string | null;

  pictureUrl?: string | null;
  currentCertificateUrl?: string | null;

  lastCalibrationDate?: string | null;
  nextCalibrationDate?: string | null;

  status?: EntityStatus;
}

export type UpdateMeterRequest = CreateMeterRequest;

export const InstallationTypeLabels: Record<InstallationType, string> = {
  [InstallationType.Central]: 'Central',
  [InstallationType.Subestacion]: 'Subestación',
  [InstallationType.Empresa]: 'Empresa'
};

export const MeterRequirementTypeLabels: Record<MeterRequirementType, string> = {
  [MeterRequirementType.Obligatorio]: 'Obligatorio',
  [MeterRequirementType.Redundante]: 'Redundante'
};