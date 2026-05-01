export interface EmptyResult {
  succeed: boolean;
  message?: string;
  messageId?: string;
  messageType?: AppMessageType;
}

export interface ApiResult<T> extends EmptyResult {
  result?: T;
}

export interface ListResult<T> extends EmptyResult {
  result: T[];
}

export interface PaginatedResult<T> extends EmptyResult {
  result: T[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  take: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export enum AppMessageType {
  InvalidRequest = 0,
  UnknownError = 1,
  NotFound = 2,
  ResourceAlreadyExists = 3,
  Unauthorized = 11,
  Forbidden = 12,
  ExternalServiceError = 13
}