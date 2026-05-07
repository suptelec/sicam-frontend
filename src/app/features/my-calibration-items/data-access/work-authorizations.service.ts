import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import {
  ApiResult,
  EmptyResult
} from '../../../shared/models/api-result.model';

import {
  AuthorizationMeterSnapshot,
  AuthorizationMeterSnapshotPhoto,
  AuthorizeCalibrationWorkAuthorizationRequest,
  CalibrationWorkAuthorization,
  CalibrationWorkAuthorizationStatus,
  CreateAuthorizationMeterSnapshotPhotoRequest,
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
      `${this.apiBaseUrl}/CalibrationPlanItems/${calibrationPlanItemId}/work-authorizations`,
      dto
    );
  }

  findApprovedByPlanItem(
    calibrationPlanItemId: number
  ): Observable<CalibrationWorkAuthorization | null> {
    return this.getAll({
      page: 1,
      take: 1,
      filter: [
        `CalibrationPlanItemId eq ${calibrationPlanItemId}`,
        `AuthorizationStatus eq ${CalibrationWorkAuthorizationStatus.Authorized}`,
        'Status eq 1'
      ].join(' and '),
      orderBy: 'ReviewedAt desc, CreatedAt desc'
    }).pipe(
      map(response => {
        if (!response.succeed || !response.result?.length) {
          return null;
        }

        return response.result[0];
      })
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

  getMeterSnapshot(
    authorizationId: number
  ): Observable<ApiResult<AuthorizationMeterSnapshot>> {
    return this.http.get<ApiResult<AuthorizationMeterSnapshot>>(
      `${this.baseUrl}/${authorizationId}/meter-snapshot`
    );
  }

  addMeterSnapshotPhoto(
    authorizationId: number,
    dto: CreateAuthorizationMeterSnapshotPhotoRequest
  ): Observable<ApiResult<AuthorizationMeterSnapshotPhoto>> {
    return this.http.post<ApiResult<AuthorizationMeterSnapshotPhoto>>(
      `${this.baseUrl}/${authorizationId}/meter-snapshot/photos`,
      dto
    );
  }

  deleteMeterSnapshotPhoto(
    authorizationId: number,
    photoId: number
  ): Observable<EmptyResult> {
    return this.http.delete<EmptyResult>(
      `${this.baseUrl}/${authorizationId}/meter-snapshot/photos/${photoId}`
    );
  }
}