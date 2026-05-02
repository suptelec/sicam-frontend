import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { ApiResult } from '../../../shared/models/api-result.model';

import {
  AddCalibrationScheduleSubmissionItemRequest,
  CalibrationScheduleSubmission,
  CalibrationScheduleSubmissionItem,
  CreateCalibrationScheduleSubmissionRequest
} from '../domain/calibration-schedule-submission.model';

@Injectable({ providedIn: 'root' })
export class CalibrationScheduleSubmissionsService extends BaseApiService<
  CalibrationScheduleSubmission,
  CreateCalibrationScheduleSubmissionRequest
> {
  protected override readonly endpoint = 'CalibrationScheduleSubmissions';

  findActiveByPlanAndPmse(
    calibrationPlanId: number,
    pmseCompanyId: number
  ): Observable<CalibrationScheduleSubmission | null> {
    return this.getAll({
      page: 1,
      take: 1,
      filter: `CalibrationPlanId eq ${calibrationPlanId} and PmseCompanyId eq ${pmseCompanyId} and Status eq 1`,
      orderBy: 'CreatedAt desc'
    }).pipe(
      map(response => {
        if (!response.succeed || !response.result?.length) {
          return null;
        }

        return response.result[0];
      })
    );
  }

  addItem(
    submissionId: number,
    dto: AddCalibrationScheduleSubmissionItemRequest
  ): Observable<ApiResult<CalibrationScheduleSubmissionItem>> {
    return this.http.post<ApiResult<CalibrationScheduleSubmissionItem>>(
      `${this.baseUrl}/${submissionId}/items`,
      dto
    );
  }

  submit(submissionId: number): Observable<ApiResult<CalibrationScheduleSubmission>> {
    return this.http.patch<ApiResult<CalibrationScheduleSubmission>>(
      `${this.baseUrl}/${submissionId}/submit`,
      {}
    );
  }
}