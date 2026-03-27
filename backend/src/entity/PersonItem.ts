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
  OneToOne,
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonTypeItem } from './PersonTypeItem';
import {
  SAPLING_HASH_COST,
  SAPLING_HASH_INDICATOR,
} from '../constants/project.constants';
import { PersonSessionItem } from './PersonSessionItem';
import { DocumentItem } from './DocumentItem';

/**
 * @class PersonItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a person or user in the system.
 * @description Contains personal details, authentication, and relations to companies, roles, tickets, notes, dashboards, favorites, and sessions. Used to manage users and their access in the system.
 *
 * @property {number} handle - Unique identifier for the person (primary key).
 * @property {string} firstName - First name of the person.
 * @property {string} lastName - Last name of the person.
 * @property {string} [loginName] - Unique login name for authentication (optional).
 * @property {string} [loginPassword] - Hashed login password (optional).
 * @property {string} [phone] - Phone number of the person (optional).
 * @property {string} [mobile] - Mobile number of the person (optional).
 * @property {string} [email] - Email address of the person (optional).
 * @property {Date} [birthDay] - Birthday of the person (optional).
 * @property {boolean} requirePasswordChange - Indicates if the person is required to change their password on next login.
 * @property {boolean} isActive - Indicates if the person is active.
 * @property {string} [color] - Color used for displaying the event type (default: #4CAF50).
 * @property {CompanyItem} [company] - The company this person belongs to (optional).
 * @property {PersonTypeItem} type - The type of this person.
 * @property {LanguageItem} [language] - The language preference for this person (optional).
 * @property {WorkHourWeekItem} [workWeek] - The work hour week this person belongs to (optional).
 * @property {Collection<RoleItem>} roles - Roles assigned to this person.
 * @property {Collection<TicketItem>} assignedTickets - Tickets assigned to this person.
 * @property {Collection<TicketItem>} createdTickets - Tickets created by this person.
 * @property {Collection<NoteItem>} notes - Notes created by this person.
 * @property {Collection<EventItem>} events - Events this person is participating in.
 * @property {Collection<DashboardItem>} dashboards - Dashboards owned by this person.
 * @property {Collection<FavoriteItem>} favorites - Favorite items referencing this person.
 * @property {PersonSessionItem} [session] - Session associated with this person (OneToOne).
 * @property {Date} createdAt - Date and time when the person was created.
 * @property {Date} updatedAt - Date and time when the person was last updated.
 *
 * @method hashPassword - Hashes the password before saving if not already hashed.
 * @method comparePassword - Compares a plain password with the stored hash.
 */
@Entity()
export class PersonItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the person (primary key).
   */
  @ApiProperty()
  @Sapling(['isPerson', 'isPartner'])
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * First name of the person.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC', 'isDuplicateCheck'])
  @Property({ length: 64, nullable: false })
  firstName: string;

  /**
   * Last name of the person.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isDuplicateCheck'])
  @Property({ length: 64, nullable: false })
  lastName: string;

  /**
   * Unique login name for authentication (optional).
   */
  @ApiPropertyOptional()
  @Property({ unique: true, length: 64, nullable: true })
  loginName?: string;

  /**
   * Hashed login password (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ nullable: true, length: 128, name: 'login_password' })
  loginPassword?: string;

  /**
   * Phone number of the person (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @Property({ nullable: true, length: 32 })
  phone?: string;

  /**
   * Mobile number of the person (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @Property({ nullable: true, length: 32 })
  mobile?: string;

  /**
   * Email address of the person (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isMail'])
  @Property({ nullable: true, length: 128 })
  email?: string;

  /**
   * Birthday of the person (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, type: 'date' })
  birthDay?: Date;

  /**
   * Indicates if the person is required to change their password on next login.
   */
  @ApiProperty()
  @Property({ default: false, nullable: false })
  requirePasswordChange?: boolean = false;

  /**
   * Indicates if the person is active.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive?: boolean = true;

  /**
   * Color used for displaying the event type (default: #4CAF50).
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color?: string = '#4CAF50';
  //#endregion

  //#region Properties: Relation
  /**
   * The company this person belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @ManyToOne(() => CompanyItem, { nullable: true })
  company?: CompanyItem;

  /**
   * The type of this person.
   */
  @ApiPropertyOptional({ type: () => PersonTypeItem, default: 'sapling' })
  @Sapling(['isChip'])
  @ManyToOne(() => PersonTypeItem, { default: 'sapling', nullable: true })
  type!: PersonTypeItem;

  /**
   * The language preference for this person (optional).
   */
  @ApiPropertyOptional({ type: () => LanguageItem })
  @ManyToOne(() => LanguageItem, { default: 'de', nullable: true })
  language?: LanguageItem;

  /**
   * The work hour week this person belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem })
  @ManyToOne(() => WorkHourWeekItem, { nullable: true })
  workWeek?: WorkHourWeekItem;

  /**
   * Roles assigned to this person.
   */
  @ApiPropertyOptional({ type: () => RoleItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @ManyToMany(() => RoleItem)
  roles: Collection<RoleItem> = new Collection<RoleItem>(this);

  /**
   * Tickets assigned to this person.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.assignee)
  assignedTickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  /**
   * Tickets created by this person.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.creator)
  createdTickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  /**
   * Notes created by this person.
   */
  @ApiPropertyOptional({ type: () => NoteItem, isArray: true })
  @OneToMany(() => NoteItem, (x) => x.person)
  notes: Collection<NoteItem> = new Collection<NoteItem>(this);

  /**
   * Events this person is participating in.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @ManyToMany(() => EventItem)
  events: Collection<EventItem> = new Collection<EventItem>(this);

  /**
   * Dashboards owned by this person.
   */
  @ApiPropertyOptional({ type: () => DashboardItem, isArray: true })
  @OneToMany(() => DashboardItem, (dashboard) => dashboard.person)
  dashboards: Collection<DashboardItem> = new Collection<DashboardItem>(this);

  /**
   * Favorite items referencing this person.
   */
  @ApiPropertyOptional({ type: () => FavoriteItem, isArray: true })
  @OneToMany(() => FavoriteItem, (favorite) => favorite.person)
  favorites: Collection<FavoriteItem> = new Collection<FavoriteItem>(this);

  /**
   * Session associated with this person (OneToOne).
   */
  @ApiPropertyOptional({ type: () => PersonSessionItem })
  @Sapling(['isHideAsReference'])
  @OneToOne(() => PersonSessionItem, (session) => session.person)
  session?: PersonSessionItem;

  /**
   * Favorite items referencing this person.
   */
  @ApiPropertyOptional({ type: () => DocumentItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => DocumentItem, (document) => document.person)
  documents: Collection<DocumentItem> = new Collection<DocumentItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the person was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the person was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
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
      !this.loginPassword.startsWith(SAPLING_HASH_INDICATOR || '$2b$')
    ) {
      this.loginPassword = await bcrypt.hash(
        this.loginPassword,
        SAPLING_HASH_COST,
      );
    }
  }

  /**
   * Compares a plain password with the stored hash.
   * @param {string | undefined} password - The password to compare.
   * @returns {boolean} True if the password matches, false otherwise.
   */
  comparePassword(password: string | undefined): boolean {
    if (this.loginPassword && password) {
      return bcrypt.compareSync(password, this.loginPassword);
    }
    return false;
  }
  //#endregion
}
