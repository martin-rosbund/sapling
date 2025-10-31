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
  Cascade,
} from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';
import { LanguageItem } from './LanguageItem';
import { TicketItem } from './TicketItem';
import { NoteItem } from './NoteItem';
import { RoleItem } from './RoleItem';
import { EventItem } from './EventItem';
import * as bcrypt from 'bcrypt';
import { DashboardItem } from './DashboardItem';
import { FavoriteItem } from './FavoriteItem';
import { Sapling } from './global/entity.decorator';
import { WorkHourWeekItem } from './WorkHourWeekItem';

/**
 * Entity representing a person or user in the system.
 * Contains personal details, authentication, and relations to companies, roles, tickets, and notes.
 */
@Entity()
export class PersonItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the person (primary key).
   */
  @Sapling({ isPerson: true })
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * First name of the person.
   */
  @Property({ length: 64, nullable: false })
  firstName: string;

  /**
   * Last name of the person.
   */
  @Property({ length: 64, nullable: false })
  lastName: string;

  /**
   * Unique login name for authentication (optional).
   */
  @Property({ unique: true, length: 64, nullable: true })
  loginName?: string | null;

  /**
   * Hashed login password (optional).
   */
  @Sapling({ isSecurity: true })
  @Property({ nullable: true, length: 128, name: 'login_password' })
  loginPassword?: string | null;

  /**
   * Phone number of the person (optional).
   */
  @Property({ nullable: true, length: 32 })
  phone?: string | null;

  /**
   * Mobile number of the person (optional).
   */
  @Property({ nullable: true, length: 32 })
  mobile?: string | null;

  /**
   * Email address of the person (optional).
   */
  @Property({ nullable: true, length: 128 })
  email?: string | null;

  /**
   * Birthday of the person (optional).
   */
  @Property({ nullable: true, type: 'date' })
  birthDay?: Date | null;

  /**
   * Indicates if the person is required to change their password on next login.
   */
  @Property({ default: false, nullable: false })
  requirePasswordChange!: boolean | null;

  /**
   * Indicates if the person is active.
   */
  @Property({ default: true, nullable: false })
  isActive!: boolean | null;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the person was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the person was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion

  //#region Properties: Relation
  /**
   * The company this person belongs to (optional).
   */
  @ManyToOne(() => CompanyItem, { nullable: true })
  company!: CompanyItem | null;

  /**
   * The language preference for this person (optional).
   */
  @ManyToOne(() => LanguageItem, { nullable: true })
  language!: LanguageItem | null;

  /**
   * The work hour week this person belongs to (optional).
   */
  @ManyToOne(() => WorkHourWeekItem, { nullable: true })
  workWeek!: WorkHourWeekItem | null;

  /**
   * Roles assigned to this person.
   */
  @ManyToMany(() => RoleItem, undefined, { cascade: [Cascade.PERSIST] })
  roles = new Collection<RoleItem>(this);

  /**
   * Tickets assigned to this person.
   */
  @OneToMany(() => TicketItem, (x) => x.assignee)
  assignedTickets = new Collection<TicketItem>(this);

  /**
   * Tickets created by this person.
   */
  @OneToMany(() => TicketItem, (x) => x.creator)
  createdTickets = new Collection<TicketItem>(this);

  /**
   * Notes created by this person.
   */
  @OneToMany(() => NoteItem, (x) => x.person)
  notes = new Collection<NoteItem>(this);

  /**
   * Events this person is participating in.
   */
  @ManyToMany(() => EventItem)
  events = new Collection<EventItem>(this);

  /**
   * Dashboards owned by this person.
   */
  @OneToMany(() => DashboardItem, (dashboard) => dashboard.person)
  dashboards = new Collection<DashboardItem>(this);

  /**
   * Favorite items referencing this person.
   */
  @OneToMany(() => FavoriteItem, (favorite) => favorite.person)
  favorites = new Collection<FavoriteItem>(this);
  //#endregion

  //#region Functions: Helper
  /**
   * Hashes the password before saving if not already hashed.
   */
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

  /**
   * Compares a plain password with the stored hash.
   * @param {string | null | undefined} password - The password to compare.
   * @returns {boolean} True if the password matches, false otherwise.
   */
  comparePassword(password: string | null | undefined): boolean {
    if (this.loginPassword && password) {
      return bcrypt.compareSync(password, this.loginPassword);
    }
    return false;
  }
  //#endregion
}
