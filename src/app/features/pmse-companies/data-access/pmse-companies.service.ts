import { Injectable } from '@angular/core';

import { BaseApiService } from '../../../core/http/base-api.service';
import {
  CreatePmseCompanyRequest,
  PmseCompany
} from '../domain/pmse-company.model';

@Injectable({ providedIn: 'root' })
export class PmseCompaniesService extends BaseApiService<
  PmseCompany,
  CreatePmseCompanyRequest
> {
  protected override readonly endpoint = 'PmseCompanies';
}