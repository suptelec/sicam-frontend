import { Injectable } from '@angular/core';

import { BaseApiService } from '../../../core/http/base-api.service';
import {
  AccreditedLaboratory,
  CreateAccreditedLaboratoryRequest
} from '../domain/accredited-laboratory.model';

@Injectable({ providedIn: 'root' })
export class AccreditedLaboratoriesService extends BaseApiService<
  AccreditedLaboratory,
  CreateAccreditedLaboratoryRequest
> {
  protected override readonly endpoint = 'AccreditedLaboratories';
}