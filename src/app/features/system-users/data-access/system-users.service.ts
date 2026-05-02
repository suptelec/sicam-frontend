import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/http/base-api.service';
import { ApiResult } from '../../../shared/models/api-result.model';

import {
  SystemUser,
  CreateCenaceUserRequest,
  CreatePmseAdminRequest,
  CreatePmseOperatorRequest
} from '../domain/system-user.model';

@Injectable({ providedIn: 'root' })
export class SystemUsersService extends BaseApiService<SystemUser> {
  protected override readonly endpoint = 'SystemUsers';

  createCenaceUser(dto: CreateCenaceUserRequest): Observable<ApiResult<SystemUser>> {
    return this.post<ApiResult<SystemUser>>('cenace', dto);
  }

  createPmseAdmin(dto: CreatePmseAdminRequest): Observable<ApiResult<SystemUser>> {
    return this.post<ApiResult<SystemUser>>('pmse-admin', dto);
  }

  createPmseOperator(dto: CreatePmseOperatorRequest): Observable<ApiResult<SystemUser>> {
    return this.post<ApiResult<SystemUser>>('pmse-operator', dto);
  }
}