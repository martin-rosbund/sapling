/**
 * Represents a favorite item for a person and entity.
 */
export interface FavoriteItem {
  /** Unique identifier for the favorite item */
  handle: number;
  /** Title of the favorite item */
  title: string;
  /** Reference to the person */
  person: PersonItem | number | null;
  /** Reference to the entity */
  entity: EntityItem | string | null;
  /** Optional filter */
  filter?: string | null;
  /** Date and time when the favorite was created */
  createdAt: Date | null;
  /** Date and time when the favorite was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a dashboard entity.
 */
export interface DashboardItem {
  /** Unique identifier for the dashboard */
  handle: number | null;
  /** Name of the dashboard */
  name: string;
  /** The person this dashboard belongs to */
  person: PersonItem | number | null;
  /** KPIs associated with this dashboard */
  kpis?: KPIItem[];
  /** Date and time when the dashboard was created */
  createdAt: Date | null;
  /** Date and time when the dashboard was last updated */
  updatedAt?: Date | null;
}
/**
 * Represents a calendar event entity.
 */
export interface EventItem {
  /** Unique identifier for the event */
  handle: number | null;
  /** Start date and time of the event */
  startDate: Date;
  /** End date and time of the event */
  endDate: Date;
  /** Indicates if the event lasts all day */
  isAllDay: boolean;
  /** The person who created the event */
  creator: PersonItem;
  /** Title of the event */
  title: string;
  /** Description of the event (optional) */
  description?: string;
  /** The type/category of the event */
  type: EventTypeItem;
  /** The status of the event */
  status: EventStatusItem;
  /** The ticket associated with this event (optional) */
  ticket?: TicketItem;
  /** Persons participating in this event */
  participants?: PersonItem[];
  /** Date and time when the event was created */
  createdAt: Date | null;
  /** Date and time when the event was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents an event type or category entity.
 */
export interface EventTypeItem {
  /** Unique identifier for the event type */
  handle: number | null;
  /** Title or name of the event type */
  title: string;
  /** Icon representing the event type */
  icon: string | null;
  /** Color used for displaying the event type */
  color: string;
  /** Events belonging to this event type */
  events?: EventItem[];
  /** Date and time when the event type was created */
  createdAt: Date | null;
  /** Date and time when the event type was last updated */
  updatedAt?: Date | null;
}
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
  /** Whether the entity is readable */
  canRead: boolean | null;
  /** Permission to insert records */
  canInsert?: boolean | null;
  /** Permission to update records */
  canUpdate?: boolean | null;
  /** Permission to delete records */
  canDelete?: boolean | null;
  /** Permission to show records */
  canShow?: boolean | null;
  /** Associated group */
  group?: EntityGroupItem | string | null;
  /** List of KPIs associated with the entity */
  kpis?: KPIItem[];
  /** List of favorites referencing this entity */
  favorites?: FavoriteItem[];
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
  /** Whether the group is expanded */
  isExpanded: boolean;
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
  roles?: (RoleItem | number)[];
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
  roles?: (RoleItem | string)[];
  /** Tickets assigned to the person */
  assignedTickets?: TicketItem[];
  /** Tickets created by the person */
  createdTickets?: TicketItem[];
  /** Notes created by the person */
  notes?: NoteItem[];
  /** Dashboards owned by this person */
  dashboards?: DashboardItem[];
  /** List of favorites referencing this person */
  favorites?: FavoriteItem[];
  /** Preferred color */
  color?: string | null;
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
  stage: RoleStageItem;
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
  /** Start date of the ticket */
  startDate?: Date | null;
  /** End date of the ticket */
  endDate?: Date | null;
  /** Deadline date of the ticket */
  deadlineDate?: Date | null;
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
  /** Color associated with the status */
  color: string;
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
  /** Unique identifier for the KPI (primary key) */
  handle: number | null;
  /** Name of the KPI */
  name: string;
  /** Description of the KPI (optional) */
  description?: string;
  /** Aggregation type (relation to KPIAggregationItem) */
  aggregation: KPIAggregationItem;
  /** Field to aggregate (e.g., "status", "priority", "product") */
  field: string;
  /** Type of KPI (relation to KPITypeItem) */
  type: KPITypeItem | string;
  /** Field to use for date comparison (optional) */
  timeframeField?: string | null;
  /** Timeframe type (relation to KPITimeframeItem, optional) */
  timeframe?: KPITimeframeItem | null;
  /** Timeframe interval (relation to KPITimeframeItem, optional) */
  timeframeInterval?: KPITimeframeItem | null;
  /** Optional filter for the KPI (JSON object) */
  filter?: object;
  /** Optional group by fields for the KPI (array of strings) */
  groupBy?: string[];
  /** Optional relations to include (array of strings) */
  relations?: string[];
  /** The entity this KPI targets (optional) */
  targetEntity?: EntityItem | string | null;
  /** Dashboards this KPI is associated with */
  dashboards?: DashboardItem[] | number[];
  /** Date and time when the KPI was created */
  createdAt: Date | null;
  /** Date and time when the KPI was last updated */
  updatedAt?: Date | null;
}

export interface KPIAggregationItem {
  /** Unique identifier for the aggregation type */
  handle: string;
  /** List of KPIs using this aggregation type */
  kpis?: KPIItem[];
}

export interface KPITimeframeItem {
  /** Unique identifier for the timeframe type */
  handle: string;
  /** List of KPIs using this timeframe */
  kpis?: KPIItem[];
  /** List of KPIs using this as interval */
  kpisInterval?: KPIItem[];
}

export interface KPITypeItem {
  /** Unique identifier for the KPI type */
  handle: string;
  /** List of KPIs using this type */
  kpis?: KPIItem[];
}

/**
 * Represents a work hour interval entity.
 */
export interface WorkHourItem {
  /** Unique identifier for the work hour interval */
  handle: number | null;
  /** Title of the work hour entry */
  title: string;
  /** Start time of the work interval (HH:mm:ss) */
  timeFrom: string;
  /** End time of the work interval (HH:mm:ss) */
  timeTo: string;
  /** Date and time when the entry was created */
  createdAt: Date | null;
  /** Date and time when the entry was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a work hour week entity.
 */
export interface WorkHourWeekItem {
  /** Unique identifier for the work hour week */
  handle: number | null;
  /** Title of the work hour week */
  title: string;
  /** Work hours for Monday */
  monday?: WorkHourItem | null;
  /** Work hours for Tuesday */
  tuesday?: WorkHourItem | null;
  /** Work hours for Wednesday */
  wednesday?: WorkHourItem | null;
  /** Work hours for Thursday */
  thursday?: WorkHourItem | null;
  /** Work hours for Friday */
  friday?: WorkHourItem | null;
  /** Work hours for Saturday */
  saturday?: WorkHourItem | null;
  /** Work hours for Sunday */
  sunday?: WorkHourItem | null;
  /** List of companies using this work hour week */
  companies?: CompanyItem[];
  /** List of persons using this work hour week */
  persons?: PersonItem[];
  /** Date and time when the entry was created */
  createdAt: Date | null;
  /** Date and time when the entry was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a stage for a role.
 */
export interface RoleStageItem {
  /** Unique identifier for the stage */
  handle: string;
  /** Title of the stage */
  title: string;
  /** List of roles in this stage */
  roles?: RoleItem[];
  /** Creation date */
  createdAt: Date | null;
  /** Last update date */
  updatedAt?: Date | null;
}

/**
 * Represents an event status entity.
 */
export interface EventStatusItem {
  /** Unique handle for the event status (e.g., 'scheduled', 'completed'). */
  handle: string;
  /** Description of the status (display name). */
  description: string;
  /** Color code (e.g., hex or color name) for UI representation. */
  color: string;
  /** All events that have this status. */
  events?: EventItem[];
  /** Date and time when the status was created. */
  createdAt: Date | null;
  /** Date and time when the status was last updated. */
  updatedAt?: Date | null;
}