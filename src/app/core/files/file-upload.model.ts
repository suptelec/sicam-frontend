export interface UploadFileRequest {
  file: File;
  folder: string;
}

export interface UploadFileResponse {
  fileName: string;
  relativeUrl: string;
  absoluteUrl: string;
}