import { LanguageItem } from '../entity/LanguageItem';
import { TranslationItem } from '../entity/TranslationItem';
import { CompanyItem } from '../entity/CompanyItem';
import { PersonItem } from '../entity/PersonItem';
import { NoteItem } from '../entity/NoteItem';
import { EntityItem } from '../entity/EntityItem';
import { RoleItem } from '../entity/RoleItem';
import { PermissionItem } from '../entity/PermissionItem';
import { TicketItem } from '../entity/TicketItem';
import { TicketPriorityItem } from '../entity/TicketPriorityItem';
import { TicketStatusItem } from '../entity/TicketStatusItem';
import { ContractItem } from '../entity/ContractItem';
import { ProductItem } from '../entity/ProductItem';
import { EntityGroupItem } from '../entity/EntityGroupItem';
import { KPIItem } from 'src/entity/KPIItem';

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
  { name: 'translation', class: TranslationItem },
];

export const ENTITY_NAMES = ENTITY_REGISTRY.map((e) => e.name);

export const ENTITY_MAP = Object.fromEntries(
  ENTITY_REGISTRY.map((e) => [e.name, e.class]),
);
