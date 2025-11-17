export type FormType = Record<string, string | number | boolean | null | undefined | object>;

/**
 * Represents a paginated API response.
 * @template T The type of data in the response.
 */
export interface PaginatedResponse<T> {
  /** Array of data items for the current page */
  data: T[];
  /** Metadata about the pagination */
  meta: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Number of items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
    /** Execution time in seconds */
    executionTime: number;
  };
}

/**
 * Represents the template/definition of an entity property.
 */
export interface EntityTemplate {
  /** Unique key for the property */
  key: string;
  /** Name of the property */
  name: string;
  /** Data type of the property */
  type: string;
  /** Length of the property (if applicable) */
  length: number;
  /** Default value (can be string, number, boolean, null, or object) */
  default: string | number | boolean | null | Record<string, unknown>;
  /** Whether this property is a primary key */
  isPrimaryKey: boolean;
  /** Whether this property is auto-incremented */
  isAutoIncrement: boolean;
  /** Join columns for relations (array of strings or objects) */
  joinColumns: Array<string>;
  /** Kind of property (e.g., relation type) */
  kind: string | null;
  /** Name of the property that maps this relation */
  mappedBy: string | null;
  /** Name of the property that inverses this relation */
  inversedBy: string | null;
  /** Name of the referenced entity */
  referenceName: string;
  /** Whether this property is a reference to another entity */
  isReference: boolean;
  /** Whether this property is a system property */
  isSystem: boolean;
  /** Whether this property is required */
  isRequired: boolean;
  /** Whether this property is nullable */
  nullable: boolean;
}

export type AccumulatedPermission = {
  entityName: string;
  allowReadStage?: string;
  allowRead?: boolean;
  allowDeleteStage?: string;
  allowDelete?: boolean;
  allowInsertStage?: string;
  allowInsert?: boolean;
  allowUpdateStage?: string;
  allowUpdate?: boolean;
  allowShowStage?: string;
  allowShow?: boolean;
};

export type TableOptionsItem = { 
  page: number; 
  itemsPerPage: number; 
  sortBy: string[]; 
  sortDesc: boolean[] 
}

export interface TicketHeaderItem {
    key: string;
    title: string;
    width?: number;
  }

export type SortItem = { 
  key: string; 
  order?: 'asc' | 'desc' 
};

export type SaplingTableHeaderItem = EntityTemplate & {
  title: string;
  [key: string]: unknown;
};