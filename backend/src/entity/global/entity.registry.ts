import { LanguageItem } from '../LanguageItem';
import { TranslationItem } from '../TranslationItem';
import { CompanyItem } from '../CompanyItem';
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
import { WebhookAuthenticationBasicItem } from '../WebhookAuthenticationBasicItem';
import { WebhookSubscriptionPayloadType } from '../WebhookSubscriptionPayloadType';
import { CountryItem } from '../CountryItem';
import { SeedScriptItem } from '../SeedScriptItem';

/**
 * Registry of all entity types used in the application.
 *
 * Each entry maps a unique entity name to its corresponding class.
 * This registry is used for dynamic entity resolution and instantiation.
 *
 * @type {{ name: string, class: any }[]}
 */
export const ENTITY_REGISTRY: { name: string; class: any }[] = [
  { name: 'country', class: CountryItem },
  { name: 'company', class: CompanyItem },
  { name: 'contract', class: ContractItem },
  { name: 'dashboard', class: DashboardItem },
  { name: 'entityGroup', class: EntityGroupItem },
  { name: 'entity', class: EntityItem },
  { name: 'favorite', class: FavoriteItem },
  { name: 'kpi', class: KpiItem },
  { name: 'document', class: DocumentItem },
  { name: 'documentType', class: DocumentTypeItem },
  { name: 'kpiAggregation', class: KpiAggregationItem },
  { name: 'kpiTimeframe', class: KpiTimeframeItem },
  { name: 'kpiType', class: KpiTypeItem },
  { name: 'language', class: LanguageItem },
  { name: 'note', class: NoteItem },
  { name: 'permission', class: PermissionItem },
  { name: 'personSession', class: PersonSessionItem },
  { name: 'personType', class: PersonTypeItem },
  { name: 'person', class: PersonItem },
  { name: 'product', class: ProductItem },
  { name: 'role', class: RoleItem },
  { name: 'roleStage', class: RoleStageItem },
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
 * Array of all entity names registered in ENTITY_REGISTRY.
 * Useful for validation, selection, or dynamic operations.
 *
 * @type {string[]}
 */
export const ENTITY_NAMES: string[] = ENTITY_REGISTRY.map((e) => e.name);

/**
 * Map of entity names to their corresponding classes.
 * Enables quick lookup and instantiation of entity classes by name.
 *
 * @type {{ [name: string]: any }}
 */
export const ENTITY_MAP: { [name: string]: any } = Object.fromEntries(
  ENTITY_REGISTRY.map((e) => [e.name, e.class]),
);
