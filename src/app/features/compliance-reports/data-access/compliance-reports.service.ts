import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FileDownloadService } from '../../../core/files/file-download.service';
import { ApiResult } from '../../../shared/models/api-result.model';
import { ComplianceReportResponse } from '../domain/compliance-report.model';

@Injectable({ providedIn: 'root' })
export class ComplianceReportsService {
  private readonly http = inject(HttpClient);
  private readonly fileDownload = inject(FileDownloadService);

  private get baseUrl(): string {
    return `${environment.apiUrl}/v1/Reports/compliance`;
  }

  getMonthly(
    year: number,
    month: number
  ): Observable<ApiResult<ComplianceReportResponse>> {
    const params = new HttpParams()
      .set('year', year)
      .set('month', month);

    return this.http.get<ApiResult<ComplianceReportResponse>>(
      `${this.baseUrl}/monthly`,
      { params }
    );
  }

  getAnnual(
    year: number
  ): Observable<ApiResult<ComplianceReportResponse>> {
    const params = new HttpParams()
      .set('year', year);

    return this.http.get<ApiResult<ComplianceReportResponse>>(
      `${this.baseUrl}/annual`,
      { params }
    );
  }

  exportMonthly(
    year: number,
    month: number
  ): void {
    this.fileDownload.downloadFromApi(
      `v1/Reports/compliance/monthly`,
      {
        fileName: `REPORTE_CUMPLIMIENTO_MENSUAL_ARCERNNR_${year}_${String(month).padStart(2, '0')}.xlsx`,
        params: {
          year,
          month,
          format: 'excel'
        }
      }
    );
  }

  exportAnnual(
    year: number
  ): void {
    this.fileDownload.downloadFromApi(
      `v1/Reports/compliance/annual`,
      {
        fileName: `REPORTE_CUMPLIMIENTO_ANUAL_ARCERNNR_${year}.xlsx`,
        params: {
          year,
          format: 'excel'
        }
      }
    );
  }
}