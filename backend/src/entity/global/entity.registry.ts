import { LanguageItem } from '../LanguageItem';
import { TranslationItem } from '../TranslationItem';
import { CompanyItem } from '../CompanyItem';
import { CompanyRelationshipItem } from '../CompanyRelationshipItem';
import { CompanyRelationshipTypeItem } from '../CompanyRelationshipTypeItem';
import { ContractServiceItem } from '../ContractServiceItem';
import { PersonItem } from '../PersonItem';
import { NoteItem } from '../NoteItem';
import { EntityItem } from '../EntityItem';
import { RoleItem } from '../RoleItem';
import { PermissionItem } from '../PermissionItem';
import { TicketItem } from '../TicketItem';
import { TicketPriorityItem } from '../TicketPriorityItem';
import { TicketStatusItem } from '../TicketStatusItem';
import { ContractItem } from '../ContractItem';
import { ProductItem } from '../ProductItem';
import { EntityGroupItem } from '../EntityGroupItem';
import { KpiItem } from '../KpiItem';
import { NoteGroupItem } from '../NoteGroupItem';
import { EventStatusItem } from '../EventStatusItem';
import { EventTypeItem } from '../EventTypeItem';
import { EventItem } from '../EventItem';
import { TicketTimeTrackingItem } from '../TicketTimeTracking';
import { RoleStageItem } from '../RoleStageItem';
import { DashboardItem } from '../DashboardItem';
import { FavoriteItem } from '../FavoriteItem';
import { KpiAggregationItem } from '../KpiAggregationItem';
import { KpiTimeframeItem } from '../KpiTimeframeItem';
import { KpiTypeItem } from '../KpiTypeItem';
import { WorkHourItem } from '../WorkHourItem';
import { WorkHourWeekItem } from '../WorkHourWeekItem';
import { PersonDepartmentItem } from '../PersonDepartmentItem';
import { PersonTypeItem } from '../PersonTypeItem';
import { PersonSessionItem } from '../PersonSessionItem';
import { WebhookAuthenticationTypeItem } from '../WebhookAuthenticationTypeItem';
import { WebhookDeliveryStatusItem } from '../WebhookDeliveryStatusItem';
import { WebhookSubscriptionMethodItem } from '../WebhookSubscriptionMethodItem';
import { WebhookSubscriptionTypeItem } from '../WebhookSubscriptionTypeItem';
import { WebhookSubscriptionItem } from '../WebhookSubscriptionItem';
import { WebhookAuthenticationApiKeyItem } from '../WebhookAuthenticationApiKeyItem';
import { WebhookAuthenticationOAuth2Item } from '../WebhookAuthenticationOAuth2Item';
import { WebhookDeliveryItem } from '../WebhookDeliveryItem';
import { EventDeliveryItem } from '../EventDeliveryItem';
import { EventDeliveryStatusItem } from '../EventDeliveryStatusItem';
import { EventGoogleItem } from '../EventGoogleItem';
import { EventAzureItem } from '../EventAzureItem';
import { DocumentItem } from '../DocumentItem';
import { DocumentTypeItem } from '../DocumentTypeItem';
import { InformationItem } from '../InformationItem';
import { WebhookAuthenticationBasicItem } from '../WebhookAuthenticationBasicItem';
import { WebhookSubscriptionPayloadType } from '../WebhookSubscriptionPayloadType';
import { CountryItem } from '../CountryItem';
import { SeedScriptItem } from '../SeedScriptItem';
import { SalesOpportunityItem } from '../SalesOpportunityItem';
import { SalesOpportunityTypeItem } from '../SalesOpportunityTypeItem';
import { SalesOpportunityForecastItem } from '../SalesOpportunityForecastItem';
import { SalesOpportunitySourceItem } from '../SalesOpportunitySourceItem';
import { EntityRouteItem } from '../EntityRouteItem';
import { MoneyItem } from '../MoneyItem';
import { ServerLandscapeItem } from '../ServerLandscapeItem';
import { ServerLandscapeTypeItem } from '../ServerLandscapeTypeItem';
import { ServerLandscapeTypeUsageItem } from '../ServerLandscapeTypeUsageItem';

/**
 * @file entity.registry.ts
 * @version     1.0
 * @author      Martin Rosbund
 * @summary     Central registry for all entity types used in the application.
 *
 * @description This module maintains a registry of all entity classes, mapping unique entity handles to their corresponding classes.
 *              It enables dynamic entity resolution, instantiation, and lookup throughout the application.
 *              The registry is used for ORM operations, validation, and dynamic selection of entity types.
 *
 * @see         CompanyItem.ts for detailed entity documentation
 */

/**
 * Registry of all entity types used in the application.
 *
 * Each entry maps a unique entity handle to its corresponding class.
 * This registry is used for dynamic entity resolution and instantiation.
 *
 * @property {string} name   Unique entity handle (lowercase, camelCase)
 * @property {any}    class  Reference to the entity class
 *
 * @example
 *   { name: 'company', class: CompanyItem }
 *   { name: 'person', class: PersonItem }
 * @type {{ name: string, class: any }[]}
 */
export const ENTITY_REGISTRY: { name: string; class: any }[] = [
  { name: 'country', class: CountryItem },
  { name: 'money', class: MoneyItem },
  { name: 'company', class: CompanyItem },
  { name: 'companyRelationship', class: CompanyRelationshipItem },
  { name: 'companyRelationshipType', class: CompanyRelationshipTypeItem },
  { name: 'contract', class: ContractItem },
  { name: 'contractService', class: ContractServiceItem },
  { name: 'serverLandscapeType', class: ServerLandscapeTypeItem },
  { name: 'serverLandscapeTypeUsage', class: ServerLandscapeTypeUsageItem },
  { name: 'serverLandscape', class: ServerLandscapeItem },
  { name: 'dashboard', class: DashboardItem },
  { name: 'entityGroup', class: EntityGroupItem },
  { name: 'entity', class: EntityItem },
  { name: 'entityRoute', class: EntityRouteItem },
  { name: 'favorite', class: FavoriteItem },
  { name: 'kpi', class: KpiItem },
  { name: 'document', class: DocumentItem },
  { name: 'documentType', class: DocumentTypeItem },
  { name: 'information', class: InformationItem },
  { name: 'kpiAggregation', class: KpiAggregationItem },
  { name: 'kpiTimeframe', class: KpiTimeframeItem },
  { name: 'kpiType', class: KpiTypeItem },
  { name: 'language', class: LanguageItem },
  { name: 'note', class: NoteItem },
  { name: 'permission', class: PermissionItem },
  { name: 'personDepartment', class: PersonDepartmentItem },
  { name: 'personSession', class: PersonSessionItem },
  { name: 'personType', class: PersonTypeItem },
  { name: 'person', class: PersonItem },
  { name: 'product', class: ProductItem },
  { name: 'role', class: RoleItem },
  { name: 'roleStage', class: RoleStageItem },
  { name: 'salesOpportunity', class: SalesOpportunityItem },
  { name: 'salesOpportunityType', class: SalesOpportunityTypeItem },
  { name: 'salesOpportunityForecast', class: SalesOpportunityForecastItem },
  { name: 'salesOpportunitySource', class: SalesOpportunitySourceItem },
  { name: 'ticket', class: TicketItem },
  { name: 'ticketPriority', class: TicketPriorityItem },
  { name: 'ticketStatus', class: TicketStatusItem },
  { name: 'ticketTimeTracking', class: TicketTimeTrackingItem },
  { name: 'translation', class: TranslationItem },
  { name: 'noteGroup', class: NoteGroupItem },
  { name: 'event', class: EventItem },
  { name: 'eventType', class: EventTypeItem },
  { name: 'eventStatus', class: EventStatusItem },
  { name: 'eventDelivery', class: EventDeliveryItem },
  { name: 'eventDeliveryStatus', class: EventDeliveryStatusItem },
  { name: 'eventGoogle', class: EventGoogleItem },
  { name: 'eventAzure', class: EventAzureItem },
  { name: 'workHour', class: WorkHourItem },
  { name: 'workHourWeek', class: WorkHourWeekItem },
  {
    name: 'webhookAuthenticationApiKey',
    class: WebhookAuthenticationApiKeyItem,
  },
  {
    name: 'webhookAuthenticationOAuth2',
    class: WebhookAuthenticationOAuth2Item,
  },
  {
    name: 'webhookAuthenticationBasic',
    class: WebhookAuthenticationBasicItem,
  },
  { name: 'webhookAuthenticationType', class: WebhookAuthenticationTypeItem },
  { name: 'webhookDelivery', class: WebhookDeliveryItem },
  { name: 'webhookDeliveryStatus', class: WebhookDeliveryStatusItem },
  { name: 'webhookSubscriptionType', class: WebhookSubscriptionTypeItem },
  {
    name: 'webhookSubscriptionPayloadType',
    class: WebhookSubscriptionPayloadType,
  },
  { name: 'webhookSubscriptionMethod', class: WebhookSubscriptionMethodItem },
  { name: 'webhookSubscription', class: WebhookSubscriptionItem },
  { name: 'seedScript', class: SeedScriptItem },
];

/**
 * Array of all entity handles registered in ENTITY_REGISTRY.
 * Useful for validation, selection, or dynamic operations.
 *
 * @type {string[]}
 */
/**
 * Array of all entity handles registered in ENTITY_REGISTRY.
 * Useful for validation, selection, or dynamic operations.
 *
 * @type {string[]}
 * @example
 *   ['company', 'person', 'contract', ...]
 */
export const ENTITY_HANDLES: string[] = ENTITY_REGISTRY.map((e) => e.name);

/**
 * Map of entity handles to their corresponding classes.
 * Enables quick lookup and instantiation of entity classes by name.
 *
 * @type {{ [name: string]: any }}
 */
/**
 * Map of entity handles to their corresponding classes.
 * Enables quick lookup and instantiation of entity classes by name.
 *
 * @type {{ [name: string]: any }}
 * @example
 *   ENTITY_MAP['company'] === CompanyItem
 *   ENTITY_MAP['person'] === PersonItem
 */
export const ENTITY_MAP: { [name: string]: any } = Object.fromEntries(
  ENTITY_REGISTRY.map((e) => [e.name, e.class]),
);
