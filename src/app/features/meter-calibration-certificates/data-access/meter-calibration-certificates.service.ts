import { Injectable } from '@angular/core';

import { BaseApiService } from '../../../core/http/base-api.service';
import {
  CreateMeterCalibrationCertificateRequest,
  MeterCalibrationCertificate
} from '../domain/meter-calibration-certificate.model';

@Injectable({ providedIn: 'root' })
export class MeterCalibrationCertificatesService extends BaseApiService<
  MeterCalibrationCertificate,
  CreateMeterCalibrationCertificateRequest
> {
  protected override readonly endpoint = 'MeterCalibrationCertificates';
}