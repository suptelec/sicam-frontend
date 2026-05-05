import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { ApiResult } from '../../../shared/models/api-result.model';
import {
  CalibrationPlanItem,
  UpdateCalibrationPlanItemPlannedRangeRequest
} from '../domain/calibration-plan.model';

@Injectable({ providedIn: 'root' })
export class CalibrationPlanItemsService extends BaseApiService<CalibrationPlanItem> {
  protected override readonly endpoint = 'CalibrationPlanItems';

  updatePlannedRange(
    id: number,
    dto: UpdateCalibrationPlanItemPlannedRangeRequest
  ): Observable<ApiResult<CalibrationPlanItem>> {
    return this.patch<ApiResult<CalibrationPlanItem>>(
      `${id}/planned-range`,
      dto
    );
  }
}