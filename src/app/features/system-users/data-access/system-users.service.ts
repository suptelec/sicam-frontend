import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SystemUser, CreateCenaceUserRequest, CreatePmseAdminRequest, CreatePmseOperatorRequest } from '../domain/system-user.model';
import { ApiResult, PaginatedResult } from '../../../shared/models/api-result.model';


@Injectable({ providedIn: 'root' })
export class SystemUsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/SystemUsers`;

  getAll(
    page = 1,
    take = 20,
    odataParams?: {
      filter?: string;
      orderby?: string;
      select?: string;
    }
  ): Observable<PaginatedResult<SystemUser>> {
    let params = new HttpParams()
      .set('page', page)
      .set('take', take);

    if (odataParams?.filter) {
      params = params.set('$filter', odataParams.filter);
    }

    if (odataParams?.orderby) {
      params = params.set('$orderby', odataParams.orderby);
    }

    if (odataParams?.select) {
      params = params.set('$select', odataParams.select);
    }

    return this.http.get<PaginatedResult<SystemUser>>(this.base, { params });
  }

  getById(id: number): Observable<ApiResult<SystemUser>> {
    return this.http.get<ApiResult<SystemUser>>(`${this.base}/${id}`);
  }

  createCenaceUser(dto: CreateCenaceUserRequest): Observable<ApiResult<SystemUser>> {
    return this.http.post<ApiResult<SystemUser>>(`${this.base}/cenace`, dto);
  }

  createPmseAdmin(dto: CreatePmseAdminRequest): Observable<ApiResult<SystemUser>> {
    return this.http.post<ApiResult<SystemUser>>(`${this.base}/pmse-admin`, dto);
  }

  createPmseOperator(dto: CreatePmseOperatorRequest): Observable<ApiResult<SystemUser>> {
    return this.http.post<ApiResult<SystemUser>>(`${this.base}/pmse-operator`, dto);
  }
}