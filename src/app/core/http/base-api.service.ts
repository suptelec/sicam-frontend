import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiResult,
  EmptyResult,
  PaginatedResult
} from '../../shared/models/api-result.model';

import { ODataQueryBuilder } from './odata-query-builder.service';
import { PaginatedODataQuery } from './odata-query.model';

export abstract class BaseApiService<
  TEntity,
  TCreate = unknown,
  TUpdate = TCreate
> {
  protected readonly http = inject(HttpClient);
  protected readonly odata = inject(ODataQueryBuilder);

  protected abstract readonly endpoint: string;

  protected get baseUrl(): string {
    return `${environment.apiUrl}/v1/${this.endpoint}`;
  }

  getAll(query?: PaginatedODataQuery): Observable<PaginatedResult<TEntity>> {
    const params = this.odata.toHttpParams(query);

    return this.http.get<PaginatedResult<TEntity>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ApiResult<TEntity>> {
    return this.http.get<ApiResult<TEntity>>(`${this.baseUrl}/${id}`);
  }

  create(dto: TCreate): Observable<ApiResult<TEntity>> {
    return this.http.post<ApiResult<TEntity>>(this.baseUrl, dto);
  }

  update(id: number, dto: TUpdate): Observable<ApiResult<TEntity>> {
    return this.http.put<ApiResult<TEntity>>(`${this.baseUrl}/${id}`, dto);
  }

  toggleStatus(id: number): Observable<EmptyResult> {
    return this.http.patch<EmptyResult>(`${this.baseUrl}/${id}/toggle-status`, {});
  }

  protected patch<TResult>(
    path: string,
    body: unknown = {}
  ): Observable<TResult> {
    return this.http.patch<TResult>(`${this.baseUrl}/${path}`, body);
  }

  protected post<TResult>(
    path: string,
    body: unknown = {}
  ): Observable<TResult> {
    return this.http.post<TResult>(`${this.baseUrl}/${path}`, body);
  }

  protected delete<TResult>(
    path: string
  ): Observable<TResult> {
    return this.http.delete<TResult>(`${this.baseUrl}/${path}`);
  }
}