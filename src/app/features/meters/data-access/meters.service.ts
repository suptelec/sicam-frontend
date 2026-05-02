import { Injectable } from '@angular/core';

import { BaseApiService } from '../../../core/http/base-api.service';
import {
  CreateMeterRequest,
  Meter,
  UpdateMeterRequest
} from '../domain/meter.model';

@Injectable({ providedIn: 'root' })
export class MetersService extends BaseApiService<
  Meter,
  CreateMeterRequest,
  UpdateMeterRequest
> {
  protected override readonly endpoint = 'Meters';
}