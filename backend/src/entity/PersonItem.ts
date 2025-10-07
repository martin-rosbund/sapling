import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';
import { LanguageItem } from './LanguageItem';
import { TicketItem } from './TicketItem';
import { NoteItem } from './NoteItem';
import { RoleItem } from './RoleItem';

@Entity()
export class PersonItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property()
  firstName: string;

  @Property()
  lastName: string;

  @Property({ unique: true })
  loginName: string;

  @Property({ nullable: true })
  loginPassword: string | null;

  @Property({ nullable: true })
  phone: string | null;

  @Property({ nullable: true })
  mobile: string | null;

  @Property({ nullable: true })
  email: string | null;

  @Property({ nullable: true })
  birthDay: Date | null;

  @Property({ default: false })
  requirePasswordChange: boolean | null = false;

  @Property({ default: true })
  isActive: boolean | null = true;

  // Relations
  @ManyToOne(() => CompanyItem, { nullable: true })
  company!: CompanyItem | null;

  @ManyToOne(() => LanguageItem, { nullable: true })
  language!: LanguageItem | null;

  @ManyToMany(() => RoleItem, undefined, { mappedBy: 'persons' })
  groups = new Collection<RoleItem>(this);

  @OneToMany(() => TicketItem, (x) => x.assignee)
  assignedTickets = new Collection<TicketItem>(this);

  @OneToMany(() => TicketItem, (x) => x.creator)
  createdTickets = new Collection<TicketItem>(this);

  @OneToMany(() => NoteItem, (x) => x.person)
  notes = new Collection<NoteItem>(this);

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
