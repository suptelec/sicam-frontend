import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { FileDownloadService } from '../../../core/files/file-download.service';
import {
  ApiResult,
  EmptyResult
} from '../../../shared/models/api-result.model';

import {
  CalibrationPlan,
  CenaceAnnualPlanValidationResponse,
  CreateCalibrationPlanRequest,
  GenerateCalibrationPlanItemsResult
} from '../domain/calibration-plan.model';

@Injectable({ providedIn: 'root' })
export class CalibrationPlansService extends BaseApiService<
  CalibrationPlan,
  CreateCalibrationPlanRequest
> {
  protected override readonly endpoint = 'CalibrationPlans';

  private readonly fileDownload = inject(FileDownloadService);

  publish(id: number): Observable<EmptyResult> {
    return this.patch<EmptyResult>(`${id}/publish`);
  }

  generateItems(id: number): Observable<ApiResult<GenerateCalibrationPlanItemsResult>> {
    return this.post<ApiResult<GenerateCalibrationPlanItemsResult>>(`${id}/generate-items`);
  }

  validateAnnualPlan(id: number): Observable<ApiResult<CenaceAnnualPlanValidationResponse>> {
    return this.http.get<ApiResult<CenaceAnnualPlanValidationResponse>>(
      `${this.baseUrl}/${id}/validate-cenace-annual-plan`
    );
  }

  exportCenaceAnnualPlan(id: number, year: number): void {
    this.fileDownload.downloadFromApi(
      `v1/CalibrationPlans/${id}/export-cenace-annual-plan`,
      {
        fileName: `PLAN ANUAL CLB ${year}.xlsx`
      }
    );
  }
}