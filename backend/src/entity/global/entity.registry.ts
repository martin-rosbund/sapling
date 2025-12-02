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
import { KpiItem } from 'src/entity/KpiItem';
import { NoteGroupItem } from 'src/entity/NoteGroupItem';
import { EventStatusItem } from 'src/entity/EventStatusItem';
import { EventTypeItem } from 'src/entity/EventTypeItem';
import { EventItem } from 'src/entity/EventItem';
import { TicketTimeTrackingItem } from 'src/entity/TicketTimeTracking';
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

/**
 * Registry of all entity types used in the application.
 *
 * Each entry maps a unique entity name to its corresponding class.
 * This registry is used for dynamic entity resolution and instantiation.
 *
 * @type {{ name: string, class: any }[]}
 */
export const ENTITY_REGISTRY: { name: string; class: any }[] = [
  { name: 'company', class: CompanyItem },
  { name: 'contract', class: ContractItem },
  { name: 'dashboard', class: DashboardItem },
  { name: 'entityGroup', class: EntityGroupItem },
  { name: 'entity', class: EntityItem },
  { name: 'favorite', class: FavoriteItem },
  { name: 'kpi', class: KpiItem },
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
  { name: 'workHour', class: WorkHourItem },
  { name: 'workHourWeek', class: WorkHourWeekItem },
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
