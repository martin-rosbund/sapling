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
import { KPIItem } from 'src/entity/KPIItem';
import { NoteGroupItem } from 'src/entity/NoteGroupItem';
import { EventTypeItem } from 'src/entity/EventTypeItem';
import { EventItem } from 'src/entity/EventItem';
import { TicketTimeTrackingItem } from 'src/entity/TicketTimeTracking';

export const ENTITY_REGISTRY = [
  { name: 'company', class: CompanyItem },
  { name: 'contract', class: ContractItem },
  { name: 'entityGroup', class: EntityGroupItem },
  { name: 'entity', class: EntityItem },
  { name: 'kpi', class: KPIItem },
  { name: 'language', class: LanguageItem },
  { name: 'note', class: NoteItem },
  { name: 'permission', class: PermissionItem },
  { name: 'person', class: PersonItem },
  { name: 'product', class: ProductItem },
  { name: 'role', class: RoleItem },
  { name: 'ticket', class: TicketItem },
  { name: 'ticketPriority', class: TicketPriorityItem },
  { name: 'ticketStatus', class: TicketStatusItem },
  { name: 'ticketTimeTracking', class: TicketTimeTrackingItem },
  { name: 'translation', class: TranslationItem },
  { name: 'noteGroup', class: NoteGroupItem },
  { name: 'event', class: EventItem },
  { name: 'eventType', class: EventTypeItem },
];

export const ENTITY_NAMES = ENTITY_REGISTRY.map((e) => e.name);

export const ENTITY_MAP = Object.fromEntries(
  ENTITY_REGISTRY.map((e) => [e.name, e.class]),
);
