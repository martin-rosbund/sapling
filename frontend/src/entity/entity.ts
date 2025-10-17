export interface LanguageItem {
  handle: string;
  name: string;
  translations?: TranslationItem[];
  persons?: PersonItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface TranslationItem {
  entity: string;
  property: string;
  language: LanguageItem;
  value: string;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface CompanyItem {
  handle: number | null;
  name: string;
  street: string;
  zip?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive: boolean | null;
  persons?: PersonItem[];
  contracts?: ContractItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface ContractItem {
  handle: number | null;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean | null;
  responseTimeHours?: number | null;
  company: CompanyItem;
  products?: ProductItem[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface EntityItem {
  handle: string;
  icon: string | null;
  route?: string | null;
  isMenu: boolean | null;
  canInsert?: boolean | null;
  canUpdate?: boolean | null;
  canDelete?: boolean | null;
  group?: EntityGroupItem | string | null;
  kpis?: KPIItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface EntityGroupItem {
  handle: string;
  icon: string | null;
  entities?: EntityItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}


export interface NoteGroupItem {
  handle: string;
  icon: string | null;
  notes?: NoteItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}
export interface NoteItem {
  handle: number | null;
  title: string;
  description?: string;
  person?: PersonItem | number | null;
  group?: NoteGroupItem | string | null;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface PermissionItem {
  allowRead: boolean | null;
  allowInsert: boolean | null;
  allowUpdate: boolean | null;
  allowDelete: boolean | null;
  allowShow: boolean | null;
  entity: EntityItem;
  roles?: RoleItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface PersonItem {
  handle: number | null;
  firstName: string;
  lastName: string;
  loginName?: string | null;
  loginPassword?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  birthDay?: Date | null;
  requirePasswordChange: boolean | null;
  isActive: boolean | null;
  company?: CompanyItem | null;
  language?: LanguageItem | null;
  roles?: RoleItem[];
  assignedTickets?: TicketItem[];
  createdTickets?: TicketItem[];
  notes?: NoteItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface ProductItem {
  handle: number | null;
  title: string;
  name: string;
  version?: string | null;
  description?: string;
  contracts?: ContractItem[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface RightItem {
  canRead: boolean | null;
  canInsert: boolean | null;
  canUpdate: boolean | null;
  canDelete: boolean | null;
  canShow: boolean | null;
  entity: EntityItem;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface RoleItem {
  handle: number | null;
  title: string;
  persons?: PersonItem[];
  permissions?: PermissionItem[];
  stage?: RoleStageItem;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface TicketItem {
  handle: number | null;
  title: string;
  problemDescription?: string;
  solutionDescription?: string;
  assignee?: PersonItem;
  creator?: PersonItem;
  status: TicketStatusItem;
  priority?: TicketPriorityItem;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface TicketPriorityItem {
  handle: string;
  description: string;
  color: string;
  tickets?: TicketItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface TicketStatusItem {
  handle: string;
  description: string;
  tickets?: TicketItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}
export interface KPIItem {
  handle: number | null;
  name: string;
  description?: string;
  aggregation: string;
  field: string;
  filter?: object;
  groupBy?: string[];
  targetEntity?: EntityItem | null;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface RoleStageItem {
  handle: string;
  description: string;
  roles?: RoleItem[];
  createdAt: Date | null;
  updatedAt?: Date | null;
}