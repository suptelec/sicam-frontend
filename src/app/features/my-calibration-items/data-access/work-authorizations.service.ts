import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { ApiResult } from '../../../shared/models/api-result.model';

import {
  AuthorizeCalibrationWorkAuthorizationRequest,
  CalibrationWorkAuthorization,
  CreateCalibrationWorkAuthorizationRequest,
  RejectCalibrationWorkAuthorizationRequest
} from '../domain/work-authorization.model';

@Injectable({ providedIn: 'root' })
export class WorkAuthorizationsService extends BaseApiService<
  CalibrationWorkAuthorization,
  CreateCalibrationWorkAuthorizationRequest
> {
  protected override readonly endpoint = 'CalibrationWorkAuthorizations';

  createForPlanItem(
    calibrationPlanItemId: number,
    dto: CreateCalibrationWorkAuthorizationRequest
  ): Observable<ApiResult<CalibrationWorkAuthorization>> {
    return this.http.post<ApiResult<CalibrationWorkAuthorization>>(
      `${this.baseUrl}/v1/CalibrationPlanItems/${calibrationPlanItemId}/work-authorizations`,
      dto
    );
  }

  authorize(
    authorizationId: number,
    dto: AuthorizeCalibrationWorkAuthorizationRequest
  ): Observable<ApiResult<CalibrationWorkAuthorization>> {
    return this.http.patch<ApiResult<CalibrationWorkAuthorization>>(
      `${this.baseUrl}/${authorizationId}/authorize`,
      dto
    );
  }

  reject(
    authorizationId: number,
    dto: RejectCalibrationWorkAuthorizationRequest
  ): Observable<ApiResult<CalibrationWorkAuthorization>> {
    return this.http.patch<ApiResult<CalibrationWorkAuthorization>>(
      `${this.baseUrl}/${authorizationId}/reject`,
      dto
    );
  }
}