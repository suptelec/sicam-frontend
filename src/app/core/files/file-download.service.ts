import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface DownloadFileOptions {
  fileName?: string;
  params?: HttpParams | Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly http = inject(HttpClient);

  downloadFromApi(
    path: string,
    options: DownloadFileOptions = {}
  ): void {
    const url = this.buildApiUrl(path);

    this.http.get(url, {
      observe: 'response',
      responseType: 'blob',
      params: options.params as any
    }).subscribe({
      next: response => {
        this.downloadBlobResponse(response, options.fileName);
      },
      error: error => {
        console.error('Error downloading file:', error);
      }
    });
  }

  downloadBlob(
    blob: Blob,
    fileName: string
  ): void {
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(objectUrl);
  }

  private downloadBlobResponse(
    response: HttpResponse<Blob>,
    fallbackFileName?: string
  ): void {
    const blob = response.body;

    if (!blob) {
      console.error('Download response does not contain a file.');
      return;
    }

    const fileName =
      fallbackFileName ??
      this.getFileNameFromContentDisposition(response) ??
      'download';

    this.downloadBlob(blob, fileName);
  }

  private getFileNameFromContentDisposition(
    response: HttpResponse<Blob>
  ): string | null {
    const contentDisposition = response.headers.get('content-disposition');

    if (!contentDisposition) {
      return null;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);

    if (fileNameMatch?.[1]) {
      return fileNameMatch[1];
    }

    return null;
  }

  private buildApiUrl(path: string): string {
    const normalizedBase = environment.apiUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');

    return `${normalizedBase}/${normalizedPath}`;
  }
}