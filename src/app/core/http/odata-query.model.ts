export interface ODataQuery {
  filter?: string;
  orderBy?: string;
  select?: string;
  expand?: string;
}

export interface PaginatedODataQuery extends ODataQuery {
  page?: number;
  take?: number;
}