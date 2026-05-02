import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResult } from '../../shared/models/api-result.model';
import {
  UploadFileRequest,
  UploadFileResponse
} from './file-upload.model';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly http = inject(HttpClient);

  upload(request: UploadFileRequest): Observable<ApiResult<UploadFileResponse>> {
    const formData = new FormData();
    formData.append('file', request.file);

    const params = new HttpParams().set('folder', request.folder);

    return this.http.post<ApiResult<UploadFileResponse>>(
      `${environment.apiUrl}/v1/Upload`,
      formData,
      { params }
    );
  }
}