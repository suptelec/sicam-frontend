import { Injectable } from '@angular/core';

import { BaseApiService } from '../../../core/http/base-api.service';
import { CalibrationPlanItem } from '../domain/calibration-plan.model';

@Injectable({ providedIn: 'root' })
export class CalibrationPlanItemsService extends BaseApiService<CalibrationPlanItem> {
  protected override readonly endpoint = 'CalibrationPlanItems';
}