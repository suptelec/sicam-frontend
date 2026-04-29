export interface PaginationRequest {
  page: number;
  take: number;
  searchTerm?: string;
  orderBy?: string;
  orderByAsc?: boolean;
}