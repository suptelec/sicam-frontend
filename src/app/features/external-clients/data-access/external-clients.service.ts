import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ExternalClient,
  CreateExternalClientRequest
} from '../domain/external-client.model';

import {
  ApiResult,
  PaginatedResult,
  EmptyResult
} from '../../../shared/models/api-result.model';

@Injectable({ providedIn: 'root' })
export class ExternalClientsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/ExternalClients`;

  getAll(
    page = 1,
    take = 20,
    odataParams?: {
      filter?: string;
      orderby?: string;
      select?: string;
    }
  ): Observable<PaginatedResult<ExternalClient>> {
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

    return this.http.get<PaginatedResult<ExternalClient>>(this.base, { params });
  }

  getById(id: number): Observable<ApiResult<ExternalClient>> {
    return this.http.get<ApiResult<ExternalClient>>(`${this.base}/${id}`);
  }

  create(dto: CreateExternalClientRequest): Observable<ApiResult<ExternalClient>> {
    return this.http.post<ApiResult<ExternalClient>>(this.base, dto);
  }

  revoke(clientId: string): Observable<EmptyResult> {
    return this.http.delete<EmptyResult>(`${this.base}/${clientId}`);
  }
}