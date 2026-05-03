import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import {
  EmptyResult,
  PaginatedResult
} from '../../../shared/models/api-result.model';

import {
  CreatePmseLaboratoryRequest,
  PmseLaboratory
} from '../domain/pmse-laboratory.model';

@Injectable({ providedIn: 'root' })
export class PmseLaboratoriesService extends BaseApiService<
  PmseLaboratory,
  CreatePmseLaboratoryRequest
> {
  protected override readonly endpoint = 'PmseCompanyLaboratoryContracts';

  getMyLaboratories(): Observable<PaginatedResult<PmseLaboratory>> {
    return this.getAll({
      page: 1,
      take: 300,
      filter: 'Status eq 1',
      orderBy: 'CreatedAt desc'
    });
  }

  deactivate(id: number): Observable<EmptyResult> {
    return this.patch<EmptyResult>(`${id}/deactivate`);
  }
}