import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiResult,
  EmptyResult,
  PaginatedResult
} from '../../../shared/models/api-result.model';

import {
  ApproveCalibrationProcessRequest,
  CalibrationProcess,
  CalibrationProcessDocument,
  CalibrationProcessEvent,
  CreateCalibrationProcessDocumentRequest,
  CreateCalibrationProcessEventRequest,
  CreateCalibrationProcessRequest,
  CreateMeterCalibrationActaSealPhotoRequest,
  MeterCalibrationActa,
  MeterCalibrationActaFormResponse,
  MeterCalibrationActaSealPhoto,
  RejectCalibrationProcessRequest,
  SaveMeterCalibrationActaRequest,
  StartCalibrationProcessCorrectionRequest,
  UpdateCalibrationProcessDataRequest
} from '../domain/calibration-process.model';

@Injectable({ providedIn: 'root' })
export class CalibrationProcessesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${environment.apiUrl}/v1`;

  getById(processId: number): Observable<ApiResult<CalibrationProcess>> {
    return this.http.get<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}`
    );
  }

  getAll(params: {
    page: number;
    take: number;
    filter?: string;
    orderBy?: string;
  }): Observable<PaginatedResult<CalibrationProcess>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('take', params.take);

    if (params.filter) {
      httpParams = httpParams.set('$filter', params.filter);
    }

    if (params.orderBy) {
      httpParams = httpParams.set('$orderby', params.orderBy);
    }

    return this.http.get<PaginatedResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses`,
      { params: httpParams }
    );
  }

  findActiveByPlanItem(
    calibrationPlanItemId: number
  ): Observable<CalibrationProcess | null> {
    let params = new HttpParams()
      .set('page', 1)
      .set('take', 1)
      .set('$filter', `CalibrationPlanItemId eq ${calibrationPlanItemId} and Status eq 1`)
      .set('$orderby', 'CreatedAt desc');

    return this.http.get<PaginatedResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses`,
      { params }
    ).pipe(
      map(response => {
        if (!response.succeed || !response.result?.length) {
          return null;
        }

        return response.result[0];
      })
    );
  }

  createForPlanItem(
    calibrationPlanItemId: number,
    dto: CreateCalibrationProcessRequest
  ): Observable<ApiResult<CalibrationProcess>> {
    return this.http.post<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationPlanItems/${calibrationPlanItemId}/calibration-processes`,
      dto
    );
  }

  addDocument(
    processId: number,
    dto: CreateCalibrationProcessDocumentRequest
  ): Observable<ApiResult<CalibrationProcessDocument>> {
    return this.http.post<ApiResult<CalibrationProcessDocument>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/documents`,
      dto
    );
  }

  addEvent(
    processId: number,
    dto: CreateCalibrationProcessEventRequest
  ): Observable<ApiResult<CalibrationProcessEvent>> {
    return this.http.post<ApiResult<CalibrationProcessEvent>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/events`,
      dto
    );
  }

  submit(
    processId: number
  ): Observable<ApiResult<CalibrationProcess>> {
    return this.http.patch<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/submit`,
      {}
    );
  }

  approve(
    processId: number,
    dto: ApproveCalibrationProcessRequest
  ): Observable<ApiResult<CalibrationProcess>> {
    return this.http.patch<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/approve`,
      dto
    );
  }

  reject(
    processId: number,
    dto: RejectCalibrationProcessRequest
  ): Observable<ApiResult<CalibrationProcess>> {
    return this.http.patch<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/reject`,
      dto
    );
  }

  startCorrection(
    processId: number,
    dto: StartCalibrationProcessCorrectionRequest
  ): Observable<ApiResult<CalibrationProcess>> {
    return this.http.patch<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/start-correction`,
      dto
    );
  }

  updateData(
    processId: number,
    dto: UpdateCalibrationProcessDataRequest
  ): Observable<ApiResult<CalibrationProcess>> {
    return this.http.patch<ApiResult<CalibrationProcess>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/data`,
      dto
    );
  }

  getActaForm(
    processId: number
  ): Observable<ApiResult<MeterCalibrationActaFormResponse>> {
    return this.http.get<ApiResult<MeterCalibrationActaFormResponse>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/acta/form`
    );
  }

  saveActa(
    processId: number,
    dto: SaveMeterCalibrationActaRequest
  ): Observable<ApiResult<MeterCalibrationActa>> {
    return this.http.put<ApiResult<MeterCalibrationActa>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/acta`,
      dto
    );
  }

  addActaSealPhoto(
    processId: number,
    sealId: number,
    dto: CreateMeterCalibrationActaSealPhotoRequest
  ): Observable<ApiResult<MeterCalibrationActaSealPhoto>> {
    return this.http.post<ApiResult<MeterCalibrationActaSealPhoto>>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/acta/seals/${sealId}/photos`,
      dto
    );
  }

  deleteActaSealPhoto(
    processId: number,
    sealId: number,
    photoId: number
  ): Observable<EmptyResult> {
    return this.http.delete<EmptyResult>(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/acta/seals/${sealId}/photos/${photoId}`
    );
  }

  exportActa(
    processId: number
  ): Observable<Blob> {
    return this.http.get(
      `${this.apiBaseUrl}/CalibrationProcesses/${processId}/acta/export`,
      { responseType: 'blob' }
    );
  }
}