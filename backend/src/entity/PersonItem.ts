import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  BeforeCreate,
  BeforeUpdate,
} from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';
import { LanguageItem } from './LanguageItem';
import { TicketItem } from './TicketItem';
import { NoteItem } from './NoteItem';
import { RoleItem } from './RoleItem';
import { EventItem } from './EventItem';
import * as bcrypt from 'bcrypt';

@Entity()
export class PersonItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 64, nullable: false })
  firstName: string;

  @Property({ length: 64, nullable: false })
  lastName: string;

  @Property({ unique: true, length: 64, nullable: true })
  loginName?: string | null;

  @Property({ nullable: true, length: 128, name: 'login_password' })
  loginPassword?: string | null;

  @BeforeCreate()
  @BeforeUpdate()
  async hashPassword() {
    if (
      this.loginPassword &&
      !this.loginPassword.startsWith(
        process.env.SAPLING_HASH_INDICATOR || '$2b$',
      )
    ) {
      this.loginPassword = await bcrypt.hash(
        this.loginPassword,
        parseInt(process.env.SAPLING_HASH_COST || '10', 10),
      );
    }
  }

  comparePassword(password: string | null | undefined): boolean {
    if (this.loginPassword && password) {
      return bcrypt.compareSync(password, this.loginPassword);
    }
    return false;
  }

  @Property({ nullable: true, length: 32 })
  phone?: string | null;

  @Property({ nullable: true, length: 32 })
  mobile?: string | null;

  @Property({ nullable: true, length: 128 })
  email?: string | null;

  @Property({ nullable: true, type: 'datetime' })
  birthDay?: Date | null;

  @Property({ default: false, nullable: false })
  requirePasswordChange!: boolean | null;

  @Property({ default: true, nullable: false })
  isActive!: boolean | null;

  // Relations
  @ManyToOne(() => CompanyItem, { nullable: true })
  company!: CompanyItem | null;

  @ManyToOne(() => LanguageItem, { nullable: true })
  language!: LanguageItem | null;

  @ManyToMany(() => RoleItem)
  roles = new Collection<RoleItem>(this);

  @OneToMany(() => TicketItem, (x) => x.assignee)
  assignedTickets = new Collection<TicketItem>(this);

  @OneToMany(() => TicketItem, (x) => x.creator)
  createdTickets = new Collection<TicketItem>(this);

  @OneToMany(() => NoteItem, (x) => x.person)
  notes = new Collection<NoteItem>(this);

  @ManyToMany(() => EventItem)
  events = new Collection<EventItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
