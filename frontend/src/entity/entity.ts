/**
 * Represents a favorite item for a person and entity.
 */
export interface SaplingGenericItem{
  [key: string]: any;
}

/**
 * Represents a company entity.
 */
export interface CompanyItem extends SaplingGenericItem{
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
export interface ContractItem extends SaplingGenericItem{
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
 * Represents a dashboard entity.
 */
export interface DashboardItem extends SaplingGenericItem {
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
 * Represents a group of entities.
 */
export interface EntityGroupItem extends SaplingGenericItem{
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
 * Represents a generic entity definition.
 */
export interface EntityItem extends SaplingGenericItem{
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
 * Entity representing an event type or category.
 * Used to classify events and provide icons/colors for display.
 */
export class EventAzureItem {
  /** Session number for the session (not primary key). */
  referenceHandle!: string;
  /** The event associated with this Azure item.*/
  event!: EventItem;
  /** Date and time when the dashboard was created. */
  createdAt?: Date = new Date();
  /** Date and time when the dashboard was last updated. */
  updatedAt?: Date = new Date();
}

/**
 * Represents a webhook delivery entity.
 */
export interface EventDeliveryItem extends SaplingGenericItem {
  /** Unique identifier for the webhook delivery (primary key) */
  handle?: number;
  /** Status of the webhook delivery */
  status?: EventDeliveryStatusItem;
  /** The event associated with this delivery */
  event: EventItem;
  /** Payload of the webhook delivery */
  payload: object;
  /** Optional request headers */
  requestHeaders?: object;
  /** Response status code of the webhook delivery */
  responseStatusCode?: number;
  /** Response body of the webhook delivery */
  responseBody?: object;
  /** Optional response headers */
  responseHeaders?: object;
  /** Date and time when the delivery was completed */
  completedAt?: Date | null;
  /** Number of delivery attempts made */
  attemptCount: number;
  /** Date and time for the next retry attempt */
  nextRetryAt?: Date | null;
  /** Date and time when the delivery was created */
  createdAt: Date | null;
  /** Date and time when the delivery was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook delivery status entity.
 */
export interface EventDeliveryStatusItem extends SaplingGenericItem {
  /** Unique identifier for the webhook delivery status */
  handle: string;
  /** Name/description of the webhook delivery status */
  description: string;
  /** Icon representing the webhook delivery status */
  icon?: string;
  /** Color associated with the webhook delivery status */
  color: string;
  /** Webhook deliveries belonging to this status */
  deliveries?: EventDeliveryItem[];
  /** Date and time when the status was created */
  createdAt?: Date | null;
  /** Date and time when the status was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a Google event entity (for Google Calendar integration).
 */
export interface EventGoogleItem extends SaplingGenericItem {
  /** Session number for the session (not primary key) */
  referenceHandle: string;
  /** The event associated with this Google item */
  event: EventItem;
  /** Date and time when the entity was created */
  createdAt?: Date | null;
  /** Date and time when the entity was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a calendar event entity.
 */
export interface EventItem extends SaplingGenericItem {
  /** Unique identifier for the event (primary key) */
  handle?: number;
  /** Title of the event */
  title: string;
  /** The person who created the event */
  creator: PersonItem;
  /** Unique transaction handle for the event */
  transactionHandle: string;
  /** Description of the event (optional) */
  description?: string;
  /** Start date and time of the event */
  startDate: Date;
  /** End date and time of the event */
  endDate: Date;
  /** Indicates if the event lasts all day */
  isAllDay: boolean;
  /** URL for the online meeting (optional) */
  onlineMeetingURL?: string;
  /** The type/category of the event */
  type: EventTypeItem;
  /** The ticket associated with this event (optional) */
  ticket?: TicketItem;
  /** Persons participating in this event */
  participants?: PersonItem[];
  /** The current status of the event */
  status: EventStatusItem;
  /** The Azure calendar item associated with this event (optional) */
  azure?: EventAzureItem;
  /** The Google calendar item associated with this event (optional) */
  google?: EventGoogleItem;
  /** Date and time when the event was created */
  createdAt?: Date | null;
  /** Date and time when the event was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents an event status entity.
 */
export interface EventStatusItem extends SaplingGenericItem{
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

/**
 * Represents an event type or category entity.
 */
export interface EventTypeItem extends SaplingGenericItem{
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
 * Represents a favorite item for a person and entity.
 */
export interface FavoriteItem extends SaplingGenericItem {
  /** Unique identifier for the favorite item */
  handle: number;
  /** Title of the favorite item */
  title: string;
  /** Reference to the person */
  person: PersonItem | null;
  /** Reference to the entity */
  entity: EntityItem | null;
  /** Optional filter */
  filter?: string | null;
  /** Date and time when the favorite was created */
  createdAt: Date | null;
  /** Date and time when the favorite was last updated */
  updatedAt?: Date | null;
}

export interface KPIAggregationItem extends SaplingGenericItem{
  /** Unique identifier for the aggregation type */
  handle: string;
  /** List of KPIs using this aggregation type */
  kpis?: KPIItem[];
}
/**
 * Represents a KPI (Key Performance Indicator) entity.
 */
export interface KPIItem extends SaplingGenericItem{
  /** Unique identifier for the KPI (primary key) */
  handle: number;
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

export interface KPITimeframeItem extends SaplingGenericItem{
  /** Unique identifier for the timeframe type */
  handle: string;
  /** List of KPIs using this timeframe */
  kpis?: KPIItem[];
  /** List of KPIs using this as interval */
  kpisInterval?: KPIItem[];
}

export interface KPITypeItem extends SaplingGenericItem{
  /** Unique identifier for the KPI type */
  handle: string;
  /** List of KPIs using this type */
  kpis?: KPIItem[];
}

/**
 * Represents a language entity.
 */
export interface LanguageItem extends SaplingGenericItem{
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
 * Represents a group of notes.
 */
export interface NoteGroupItem extends SaplingGenericItem{
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
export interface NoteItem extends SaplingGenericItem{
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
export interface PermissionItem extends SaplingGenericItem{
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
export interface PersonItem extends SaplingGenericItem{
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
 * Represents a person session entity (authentication session for a person).
 */
export interface PersonSessionItem extends SaplingGenericItem {
  /** Session number for the session (not primary key) */
  number: string;
  /** Access token for the session */
  accessToken: string;
  /** Refresh token for the session */
  refreshToken: string;
  /** The person this session belongs to */
  person: PersonItem;
  /** Date and time when the session was created */
  createdAt?: Date | null;
  /** Date and time when the session was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a person type entity (classification for persons).
 */
export interface PersonTypeItem extends SaplingGenericItem {
  /** Unique identifier for the person type (primary key) */
  handle: string;
  /** Icon representing the person type */
  icon?: string;
  /** Color used for displaying the person type */
  color: string;
  /** Persons belonging to this type */
  persons?: PersonItem[];
  /** Date and time when the type was created */
  createdAt?: Date | null;
  /** Date and time when the type was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a product entity.
 */
export interface ProductItem extends SaplingGenericItem{
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
export interface RoleItem extends SaplingGenericItem{
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
 * Represents a stage for a role.
 */
export interface RoleStageItem extends SaplingGenericItem{
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
 * Represents a ticket entity.
 */
export interface TicketItem extends SaplingGenericItem{
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
export interface TicketPriorityItem extends SaplingGenericItem{
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
export interface TicketStatusItem extends SaplingGenericItem{
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
 * Represents a ticket time tracking entry (work log for a ticket).
 */
export interface TicketTimeTrackingItem extends SaplingGenericItem {
  /** Unique identifier for the time tracking entry */
  handle?: number;
  /** Title of the time tracking entry */
  title: string;
  /** Description of the time tracking entry */
  description: string;
  /** Person who performed the work */
  person: PersonItem;
  /** Ticket to which this time entry belongs */
  ticket: TicketItem;
  /** Start time of the tracked work interval */
  startTime: Date;
  /** End time of the tracked work interval */
  endTime: Date;
  /** Date and time when the entry was created */
  createdAt?: Date | null;
  /** Date and time when the entry was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a translation for a property of an entity in a specific language.
 */
export interface TranslationItem extends SaplingGenericItem{
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
 * Represents a webhook delivery entity.
 */
export interface WebhookDeliveryItem extends SaplingGenericItem {
  /** Unique identifier for the webhook delivery (primary key) */
  handle?: number;
  /** Status of the webhook delivery */
  status?: WebhookDeliveryStatusItem;
  /** The webhook subscription associated with this delivery */
  subscription: WebhookSubscriptionItem;
  /** Payload of the webhook delivery */
  payload: object;
  /** Optional request headers */
  requestHeaders?: object;
  /** Response status code of the webhook delivery */
  responseStatusCode?: number;
  /** Response body of the webhook delivery */
  responseBody?: object;
  /** Optional response headers */
  responseHeaders?: object;
  /** Date and time when the delivery was completed */
  completedAt?: Date | null;
  /** Number of delivery attempts made */
  attemptCount: number;
  /** Date and time for the next retry attempt */
  nextRetryAt?: Date | null;
  /** Date and time when the delivery was created */
  createdAt?: Date | null;
  /** Date and time when the delivery was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook delivery status entity.
 */
export interface WebhookDeliveryStatusItem extends SaplingGenericItem {
  /** Unique identifier for the webhook delivery status */
  handle: string;
  /** Name/description of the webhook delivery status */
  description: string;
  /** Icon representing the webhook delivery status */
  icon?: string;
  /** Color associated with the webhook delivery status */
  color: string;
  /** Webhook deliveries belonging to this status */
  deliveries?: WebhookDeliveryItem[];
  /** Date and time when the status was created */
  createdAt?: Date | null;
  /** Date and time when the status was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook subscription entity.
 */
export interface WebhookSubscriptionItem extends SaplingGenericItem {
  /** Unique identifier for the webhook subscription (primary key) */
  handle?: number;
  /** Description of the webhook subscription */
  description: string;
  /** URL of the webhook subscription */
  url: string;
  /** Optional custom headers */
  customHeaders?: object;
  /** Indicates whether the webhook subscription is active */
  isActive: boolean;
  /** Signing secret for the webhook subscription */
  signingSecret?: string;
  /** Entity associated with this webhook subscription */
  entity: EntityItem;
  /** Type of the webhook subscription */
  type: WebhookSubscriptionTypeItem;
  /** Method of the webhook subscription */
  method: WebhookSubscriptionMethodItem;
  /** Authentication type of the webhook subscription */
  authenticationType?: WebhookAuthenticationTypeItem;
  /** OAuth2 authentication details (optional) */
  authenticationOAuth2?: WebhookAuthenticationOAuth2Item;
  /** API Key authentication details (optional) */
  authenticationApiKey?: WebhookAuthenticationApiKeyItem;
  /** Webhook deliveries for this subscription */
  deliveries?: WebhookDeliveryItem[];
  /** Date and time when the subscription was created */
  createdAt?: Date | null;
  /** Date and time when the subscription was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook subscription type entity.
 */
export interface WebhookSubscriptionTypeItem extends SaplingGenericItem {
  /** Unique identifier for the webhook subscription type */
  handle: string;
  /** Name/description of the webhook subscription type */
  description: string;
  /** Icon representing the webhook subscription type */
  icon?: string;
  /** Color associated with the webhook subscription type */
  color?: string;
  /** Webhook subscriptions belonging to this type */
  subscriptions?: WebhookSubscriptionItem[];
  /** Date and time when the type was created */
  createdAt?: Date | null;
  /** Date and time when the type was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook subscription method entity.
 */
export interface WebhookSubscriptionMethodItem extends SaplingGenericItem {
  /** Unique identifier for the webhook subscription method */
  handle: string;
  /** Name/description of the webhook subscription method */
  description: string;
  /** Icon representing the webhook subscription method */
  icon?: string;
  /** Color associated with the webhook subscription method */
  color?: string;
  /** Webhook subscriptions belonging to this method */
  subscriptions?: WebhookSubscriptionItem[];
  /** Date and time when the method was created */
  createdAt?: Date | null;
  /** Date and time when the method was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook authentication type entity.
 */
export interface WebhookAuthenticationTypeItem extends SaplingGenericItem {
  /** Unique identifier for the webhook authentication type */
  handle: string;
  /** Name/description of the webhook authentication type */
  description: string;
  /** Icon representing the webhook authentication type */
  icon?: string;
  /** Color associated with the webhook authentication type */
  color: string;
  /** Webhook subscriptions belonging to this authentication type */
  subscriptions?: WebhookSubscriptionItem[];
  /** Date and time when the type was created */
  createdAt?: Date | null;
  /** Date and time when the type was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook authentication OAuth2 entity.
 */
export interface WebhookAuthenticationOAuth2Item extends SaplingGenericItem {
  /** Unique identifier for the OAuth2 item (primary key) */
  handle?: number;
  /** Description of the OAuth2 item */
  description: string;
  /** Client ID for OAuth2 authentication */
  clientId: string;
  /** Client secret for OAuth2 authentication */
  clientSecret: string;
  /** Token URL for obtaining OAuth2 tokens */
  tokenUrl: string;
  /** Scope for OAuth2 authentication (optional) */
  scope?: string;
  /** Cached token (optional) */
  cachedToken?: string;
  /** Token expiration date and time (optional) */
  tokenExpiresAt?: Date;
  /** Webhook subscriptions belonging to this authentication type */
  subscriptions?: WebhookSubscriptionItem[];
  /** Date and time when the item was created */
  createdAt?: Date | null;
  /** Date and time when the item was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a webhook authentication API Key entity.
 */
export interface WebhookAuthenticationApiKeyItem extends SaplingGenericItem {
  /** Unique identifier for the API Key item (primary key) */
  handle?: number;
  /** Description of the API Key item */
  description: string;
  /** Header name for the API Key authentication */
  headerName: string;
  /** API Key value (optional) */
  apiKey?: string;
  /** Webhook subscriptions belonging to this authentication type */
  subscriptions?: WebhookSubscriptionItem[];
  /** Date and time when the item was created */
  createdAt?: Date | null;
  /** Date and time when the item was last updated */
  updatedAt?: Date | null;
}

/**
 * Represents a work hour interval entity.
 */
export interface WorkHourItem extends SaplingGenericItem{
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
export interface WorkHourWeekItem extends SaplingGenericItem{
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