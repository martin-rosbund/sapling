export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EntityTemplate {
    name: string;
    type: string;
    length: number;
    default: any;
    isPrimaryKey: boolean;
}