import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PmseCompany, CreatePmseCompanyRequest } from '../domain/pmse-company.model';
import { ApiResult, PaginatedResult, EmptyResult } from '../../../shared/models/api-result.model';


@Injectable({ providedIn: 'root' })
export class PmseCompaniesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/PmseCompanies`;

  getAll(
    page = 1,
    take = 20,
    odataParams?: {
        filter?:  string;
        orderby?: string;
        select?:  string;
    }
    ): Observable<PaginatedResult<PmseCompany>> {
    let params = new HttpParams()
        .set('page', page)
        .set('take', take);

    if (odataParams?.filter)  params = params.set('$filter',  odataParams.filter);
    if (odataParams?.orderby) params = params.set('$orderby', odataParams.orderby);
    if (odataParams?.select)  params = params.set('$select',  odataParams.select);

    return this.http.get<PaginatedResult<PmseCompany>>(this.base, { params });
 }

  getById(id: number): Observable<ApiResult<PmseCompany>> {
    return this.http.get<ApiResult<PmseCompany>>(`${this.base}/${id}`);
  }

  create(dto: CreatePmseCompanyRequest): Observable<ApiResult<PmseCompany>> {
    return this.http.post<ApiResult<PmseCompany>>(this.base, dto);
  }

  toggleStatus(id: number): Observable<EmptyResult> {
    return this.http.patch<EmptyResult>(`${this.base}/${id}/toggle-status`, {});
  }
}