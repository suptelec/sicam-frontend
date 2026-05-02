import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { PaginatedODataQuery } from './odata-query.model';

@Injectable({ providedIn: 'root' })
export class ODataQueryBuilder {
  toHttpParams(query?: PaginatedODataQuery): HttpParams {
    let params = new HttpParams()
      .set('page', query?.page ?? 1)
      .set('take', query?.take ?? 20);

    if (query?.filter) {
      params = params.set('$filter', query.filter);
    }

    if (query?.orderBy) {
      params = params.set('$orderby', query.orderBy);
    }

    if (query?.select) {
      params = params.set('$select', query.select);
    }

    if (query?.expand) {
      params = params.set('$expand', query.expand);
    }

    return params;
  }

  containsInsensitive(field: string, value: string): string {
    const safeValue = this.escapeString(value.trim().toLowerCase());

    return `contains(tolower(${field}),'${safeValue}')`;
  }

  eqString(field: string, value: string): string {
    const safeValue = this.escapeString(value.trim());

    return `${field} eq '${safeValue}'`;
  }

  eqNumber(field: string, value: number): string {
    return `${field} eq ${value}`;
  }

  eqBoolean(field: string, value: boolean): string {
    return `${field} eq ${value}`;
  }

  and(...filters: Array<string | undefined | null>): string | undefined {
    const validFilters = filters.filter(Boolean) as string[];

    if (!validFilters.length) return undefined;

    return validFilters.map(filter => `(${filter})`).join(' and ');
  }

  or(...filters: Array<string | undefined | null>): string | undefined {
    const validFilters = filters.filter(Boolean) as string[];

    if (!validFilters.length) return undefined;

    return validFilters.map(filter => `(${filter})`).join(' or ');
  }

  searchInFields(fields: string[], value: string): string | undefined {
    const search = value.trim();

    if (!search) return undefined;

    return this.or(
      ...fields.map(field => this.containsInsensitive(field, search))
    );
  }

  private escapeString(value: string): string {
    return value.replace(/'/g, "''");
  }
}