import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiResult,
  EmptyResult
} from '../../../shared/models/api-result.model';

import {
  RegulatoryReportSettings,
  RegulatoryRulesSettings,
  UpdateRegulatoryReportSettings,
  UpdateRegulatoryRulesSettings
} from '../domain/system-settings.model';

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${environment.apiUrl}/v1/SystemSettings`;
  }

  getRegulatoryRules(): Observable<ApiResult<RegulatoryRulesSettings>> {
    return this.http.get<ApiResult<RegulatoryRulesSettings>>(
      `${this.baseUrl}/regulatory-rules`
    );
  }

  updateRegulatoryRules(
    dto: UpdateRegulatoryRulesSettings
  ): Observable<EmptyResult> {
    return this.http.put<EmptyResult>(
      `${this.baseUrl}/regulatory-rules`,
      dto
    );
  }

  getRegulatoryReports(): Observable<ApiResult<RegulatoryReportSettings>> {
    return this.http.get<ApiResult<RegulatoryReportSettings>>(
      `${this.baseUrl}/regulatory-reports`
    );
  }

  updateRegulatoryReports(
    dto: UpdateRegulatoryReportSettings
  ): Observable<EmptyResult> {
    return this.http.put<EmptyResult>(
      `${this.baseUrl}/regulatory-reports`,
      dto
    );
  }
}