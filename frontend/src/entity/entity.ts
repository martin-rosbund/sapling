export interface LanguageItem {
  handle: string;
  name: string;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface TranslationItem {
  entity: string;
  property: string;
  language: string;
  value: string;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface CompanyItem {
  handle: number | null;
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  isActive: boolean | null;
  requirePasswordChange: boolean | null;
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
  isActive: boolean;
  responseTimeHours?: number;
  company: CompanyItem;
  products?: ProductItem[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface EntityItem {
  handle: string;
  icon: string | null;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface NoteItem {
  handle: number | null;
  title: string;
  description?: string;
  person?: PersonItem;
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
  role: RoleItem;
  createdAt: Date | null;
  updatedAt?: Date | null;
}

export interface PersonItem {
  handle: number | null;
  firstName: string;
  lastName: string;
  loginName: string;
  loginPassword: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  birthDay: Date | null;
  requirePasswordChange: boolean | null;
  isActive: boolean | null;
  company?: CompanyItem | null;
  language?: LanguageItem | null;
  groups?: RoleItem[];
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
  version?: string;
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