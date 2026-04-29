export interface EmptyResultDto {
  succeed: boolean;
  message?: string;
  messageId?: string;
  messageType?: AppMessageType;
}

export interface ResultDto<T> extends EmptyResultDto {
  data?: T;
}

export interface ListResultDto<T> extends EmptyResultDto {
  data?: T[];
}

export interface PaginatedResultDto<T> extends EmptyResultDto {
  data?: T[];
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