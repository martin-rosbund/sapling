/**
 * Represents a language entity.
 */
export interface LanguageItem {
  /** Unique identifier for the language */
  handle: string;
  /** Name of the language */
  name: string;
  /** List of translations associated with this language */
  translations?: TranslationItem[];
  /** List of persons associated with this language */
  persons?: PersonItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a translation for a property of an entity in a specific language.
 */
export interface TranslationItem {
  /** Name of the entity being translated */
  entity: string;
  /** Name of the property being translated */
  property: string;
  /** Language of the translation */
  language: LanguageItem;
  /** Translated value */
  value: string;
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a company entity.
 */
export interface CompanyItem {
  /** Unique identifier for the company */
  handle: number;
  /** Name of the company */
  name: string;
  /** Street address */
  street: string;
  /** ZIP code */
  zip?: string | null;
  /** City */
  city?: string | null;
  /** Phone number */
  phone?: string | null;
  /** Email address */
  email?: string | null;
  /** Website URL */
  website?: string | null;
  /** Whether the company is active */
  isActive: boolean | null;
  /** List of persons associated with the company */
  persons?: PersonItem[];
  /** List of contracts associated with the company */
  contracts?: ContractItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a contract entity.
 */
export interface ContractItem {
  /** Unique identifier for the contract */
  handle: number | null;
  /** Title of the contract */
  title: string;
  /** Description of the contract */
  description?: string;
  /** Start date of the contract */
  startDate: Date;
  /** End date of the contract */
  endDate?: Date | null;
  /** Whether the contract is active */
  isActive: boolean | null;
  /** Response time in hours */
  responseTimeHours?: number | null;
  /** Associated company */
  company: CompanyItem;
  /** List of products associated with the contract */
  products?: ProductItem[];
  /** Creation date */
  createdAt: Date;
  /** Last update date */
  updatedAt?: Date;
}

/**
 * Represents a generic entity definition.
 */
export interface EntityItem {
  /** Unique identifier for the entity */
  handle: string;
  /** Icon for the entity */
  icon: string | null;
  /** Route path for the entity */
  route?: string | null;
  /** Whether the entity is shown in the menu */
  isMenu: boolean | null;
  /** Permission to insert records */
  canInsert?: boolean | null;
  /** Permission to update records */
  canUpdate?: boolean | null;
  /** Permission to delete records */
  canDelete?: boolean | null;
  /** Associated group */
  group?: EntityGroupItem | string | null;
  /** List of KPIs associated with the entity */
  kpis?: KPIItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a group of entities.
 */
export interface EntityGroupItem {
  /** Unique identifier for the group */
  handle: string;
  /** Icon for the group */
  icon: string | null;
  /** List of entities in the group */
  entities?: EntityItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}


/**
 * Represents a group of notes.
 */
export interface NoteGroupItem {
  /** Unique identifier for the note group */
  handle: string;
  /** Icon for the note group */
  icon: string | null;
  /** List of notes in the group */
  notes?: NoteItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}
/**
 * Represents a note entity.
 */
export interface NoteItem {
  /** Unique identifier for the note */
  handle: number | null;
  /** Title of the note */
  title: string;
  /** Description of the note */
  description?: string;
  /** Associated person (object or ID) */
  person?: PersonItem | number | null;
  /** Associated note group (object or ID) */
  group?: NoteGroupItem | string | null;
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a permission for an entity and associated roles.
 */
export interface PermissionItem {
  /** Permission to read */
  allowRead: boolean | null;
  /** Permission to insert */
  allowInsert: boolean | null;
  /** Permission to update */
  allowUpdate: boolean | null;
  /** Permission to delete */
  allowDelete: boolean | null;
  /** Permission to show */
  allowShow: boolean | null;
  /** Associated entity */
  entity: EntityItem | string;
  /** Associated roles */
  roles?: RoleItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a person entity.
 */
export interface PersonItem {
  /** Unique identifier for the person */
  handle: number | null;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Login name */
  loginName?: string | null;
  /** Login password */
  loginPassword?: string | null;
  /** Phone number */
  phone?: string | null;
  /** Mobile number */
  mobile?: string | null;
  /** Email address */
  email?: string | null;
  /** Birthday */
  birthDay?: Date | null;
  /** Whether password change is required */
  requirePasswordChange: boolean | null;
  /** Whether the person is active */
  isActive: boolean | null;
  /** Associated company */
  company?: CompanyItem | null;
  /** Preferred language */
  language?: LanguageItem | null;
  /** List of roles assigned to the person */
  roles?: RoleItem[];
  /** Tickets assigned to the person */
  assignedTickets?: TicketItem[];
  /** Tickets created by the person */
  createdTickets?: TicketItem[];
  /** Notes created by the person */
  notes?: NoteItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a product entity.
 */
export interface ProductItem {
  /** Unique identifier for the product */
  handle: number | null;
  /** Title of the product */
  title: string;
  /** Name of the product */
  name: string;
  /** Version of the product */
  version?: string | null;
  /** Description of the product */
  description?: string;
  /** List of contracts associated with the product */
  contracts?: ContractItem[];
  /** Creation date */
  createdAt: Date;
  /** Last update date */
  updatedAt?: Date;
}

/**
 * Represents a right for an entity.
 */
export interface RightItem {
  /** Right to read */
  canRead: boolean | null;
  /** Right to insert */
  canInsert: boolean | null;
  /** Right to update */
  canUpdate: boolean | null;
  /** Right to delete */
  canDelete: boolean | null;
  /** Right to show */
  canShow: boolean | null;
  /** Associated entity */
  entity: EntityItem;
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a role entity.
 */
export interface RoleItem {
  /** Unique identifier for the role */
  handle: number | null;
  /** Title of the role */
  title: string;
  /** List of persons assigned to the role */
  persons?: PersonItem[];
  /** List of permissions for the role */
  permissions?: PermissionItem[];
  /** Associated stage */
  stage?: RoleStageItem;
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a ticket entity.
 */
export interface TicketItem {
  /** Unique identifier for the ticket */
  handle: number | null;
  /** Title of the ticket */
  title: string;
  /** Description of the problem */
  problemDescription?: string;
  /** Description of the solution */
  solutionDescription?: string;
  /** Person assigned to the ticket */
  assignee?: PersonItem;
  /** Person who created the ticket */
  creator?: PersonItem;
  /** Status of the ticket */
  status: TicketStatusItem;
  /** Priority of the ticket */
  priority?: TicketPriorityItem;
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a ticket priority entity.
 */
export interface TicketPriorityItem {
  /** Unique identifier for the priority */
  handle: string;
  /** Description of the priority */
  description: string;
  /** Color associated with the priority */
  color: string;
  /** List of tickets with this priority */
  tickets?: TicketItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a ticket status entity.
 */
export interface TicketStatusItem {
  /** Unique identifier for the status */
  handle: string;
  /** Description of the status */
  description: string;
  /** List of tickets with this status */
  tickets?: TicketItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}
/**
 * Represents a KPI (Key Performance Indicator) entity.
 */
export interface KPIItem {
  /** Unique identifier for the KPI */
  handle: number | null;
  /** Name of the KPI */
  name: string;
  /** Description of the KPI */
  description?: string;
  /** Aggregation type (e.g., sum, avg) */
  aggregation: string;
  /** Field to aggregate */
  field: string;
  /** Optional filter for the KPI */
  filter?: object;
  /** Group by fields */
  groupBy?: string[];
  /** Target entity for the KPI */
  targetEntity?: EntityItem | null;
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents a stage for a role.
 */
export interface RoleStageItem {
  /** Unique identifier for the stage */
  handle: string;
  /** Description of the stage */
  description: string;
  /** List of roles in this stage */
  roles?: RoleItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}