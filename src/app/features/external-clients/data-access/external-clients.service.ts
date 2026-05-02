import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { EmptyResult } from '../../../shared/models/api-result.model';

import {
  CreateExternalClientRequest,
  ExternalClient
} from '../domain/external-client.model';

@Injectable({ providedIn: 'root' })
export class ExternalClientsService extends BaseApiService<
  ExternalClient,
  CreateExternalClientRequest
> {
  protected override readonly endpoint = 'ExternalClients';

  revoke(clientId: string): Observable<EmptyResult> {
    return this.delete<EmptyResult>(clientId);
  }
}