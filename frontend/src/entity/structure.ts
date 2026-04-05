import type TranslationService from "@/services/translation.service";
import type { EntityItem, SaplingGenericItem } from "./entity";

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

export type SaplingOption =
  | 'isCompany'
  | 'isPerson'
  | 'isEntity'
  | 'isSecurity'
  | 'isShowInCompact'
  | 'isHideAsReference'
  | 'isColor'
  | 'isIcon'
  | 'isChip'
  | 'isReadOnly'
  | 'isLink'
  | 'isMail'
  | 'isPhone'
  | 'isOrderASC'
  | 'isOrderDESC'
  | 'isNavigation'
  | 'isMarkdown'
  | 'isSystem'
  | 'isPercent'
  | 'isMoney'
  | 'isDuplicateCheck'
  | 'isPartner'
  | 'isToday'
  | 'isDeadline'
  | 'isCurrentPerson'
  | 'isCurrentCompany';

export interface EntityTemplateReferenceDependency {
  parentField: string;
  targetField: string;
  requireParent?: boolean;
  clearOnParentChange?: boolean;
}

export type DialogState =
  | 'create' 
  | 'edit' 
  | 'readonly';

export type EditDialogOptions = { 
  visible: boolean; 
  mode: DialogState; 
  item: SaplingGenericItem | null 
};
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
  length?: number;
  /** Default value (can be string, number, boolean, null, or object) */
  default?: string | number | boolean | null | Record<string, unknown>;
  /** Default value (can be string, number, boolean, null, or object) */
  defaultRaw?: string | number | boolean | null | Record<string, unknown>;
  /** Whether this property is a primary key */
  isPrimaryKey?: boolean;
  /** Whether this property is auto-incremented */
  isAutoIncrement?: boolean;
  /** Kind of property (e.g., relation type) */
  kind?: string | null;
  /** Name of the property that maps this relation */
  mappedBy?: string | null;
  /** Name of the property that inverses this relation */
  inversedBy?: string | null;
  /** Whether this property has a unique constraint */
  isUnique?: boolean;
  /** Name of the referenced entity, if this property is a relation */
  referenceName?: string;
  /** Whether this property is a reference to another entity */
  isReference?: boolean;
  /** Whether this property is required */
  isRequired?: boolean;
  /** Whether this property is nullable */
  nullable?: boolean;
  /** Referenced primary keys for the property, if any */
  referencedPks?: string[];
  /** Whether this property is persistent */
  isPersistent?: boolean;
  /** Additional options defined via Sapling decorators on the property */
  options?: SaplingOption[];
  /** Declarative parent-child dependency metadata for reference fields */
  referenceDependency?: EntityTemplateReferenceDependency | null;
}

export type AccumulatedPermission = {
  entityHandle: string;
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
  sortBy: SortItem[];
  sortDesc: boolean[];
  search?: string;
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

export type ColumnFilterOperator = 'like' | 'startsWith' | 'endsWith' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte';

export type ColumnFilterItem = {
  operator: ColumnFilterOperator;
  value: string;
  rangeStart?: string;
  rangeEnd?: string;
  relationItems?: SaplingGenericItem[];
};

export type SaplingTableHeaderItem = EntityTemplate & {
  title: string;
  [key: string]: unknown;
};

export type EntityState = {
  entity: EntityItem | null;
  entityPermission: AccumulatedPermission | null;
  entityTranslation: TranslationService;
  entityTemplates: EntityTemplate[];
  isLoading: boolean;
  currentEntityName: string;
  currentNamespaces: string[];
}

export type KpiSparklineData = {
  value: KpiSparklineValue[];
} 

export type KpiSparklineValue = {
  value: number;
  [key: string]: number;
} 

export type KpiTrendData = {
  value: KpiTrendValue;
} 

export type KpiTrendValue = {
  current: number;
  previous: number;
} 

export type KpiItemData = {
  value: number;
} 

export type KpiListData = {
  value: Array<Record<string, number>>;
} 