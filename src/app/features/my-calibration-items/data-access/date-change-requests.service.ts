import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { ApiResult } from '../../../shared/models/api-result.model';

import {
  CalibrationDateChangeRequest,
  CreateCalibrationDateChangeRequest
} from '../domain/date-change-request.model';

@Injectable({ providedIn: 'root' })
export class DateChangeRequestsService extends BaseApiService<
  CalibrationDateChangeRequest,
  CreateCalibrationDateChangeRequest
> {
  protected override readonly endpoint = 'CalibrationDateChangeRequests';

  createForPlanItem(
    calibrationPlanItemId: number,
    dto: CreateCalibrationDateChangeRequest
  ): Observable<ApiResult<CalibrationDateChangeRequest>> {
    return this.http.post<ApiResult<CalibrationDateChangeRequest>>(
      `${this.baseUrl}/v1/CalibrationPlanItems/${calibrationPlanItemId}/date-change-requests`,
      dto
    );
  }
}