export interface PaginatedResult<T> {
  succeed:      boolean;
  result:       T[];
  currentPage:  number;
  totalPages:   number;
  totalRecords: number;
  take:         number;
  hasNext:      boolean;
  hasPrevious:  boolean;
}

export interface ApiResult<T> {
  succeed:  boolean;
  result?:  T;
  message?: string;
}

export interface EmptyResult {
  succeed:  boolean;
  message?: string;
}