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
  @ApiProperty()
  @Sapling(['isPerson'])
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * First name of the person.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  firstName: string;

  /**
   * Last name of the person.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  lastName: string;

  /**
   * Unique login name for authentication (optional).
   */
  @ApiPropertyOptional()
  @Property({ unique: true, length: 64, nullable: true })
  loginName?: string | null;

  /**
   * Hashed login password (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ nullable: true, length: 128, name: 'login_password' })
  loginPassword?: string | null;

  /**
   * Phone number of the person (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @Property({ nullable: true, length: 32 })
  phone?: string | null;

  /**
   * Mobile number of the person (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @Property({ nullable: true, length: 32 })
  mobile?: string | null;

  /**
   * Email address of the person (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isMail'])
  @Property({ nullable: true, length: 128 })
  email?: string | null;

  /**
   * Birthday of the person (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, type: 'date' })
  birthDay?: Date | null;

  /**
   * Indicates if the person is required to change their password on next login.
   */
  @ApiProperty()
  @Property({ default: false, nullable: false })
  requirePasswordChange!: boolean | null;

  /**
   * Indicates if the person is active.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive!: boolean | null;

  /**
   * Color used for displaying the event type (default: #4CAF50).
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string | null;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the person was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the person was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion

  //#region Properties: Relation
  /**
   * The company this person belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @ManyToOne(() => CompanyItem, { nullable: true })
  company!: CompanyItem | null;

  /**
   * The type of this person.
   */
  @ApiPropertyOptional({ type: () => PersonTypeItem, default: 'sapling' })
  @Sapling(['isChip'])
  @ManyToOne(() => PersonTypeItem, { default: 'sapling', nullable: true })
  type!: PersonTypeItem | null;

  /**
   * The language preference for this person (optional).
   */
  @ApiPropertyOptional({ type: () => LanguageItem })
  @ManyToOne(() => LanguageItem, { default: 'de', nullable: true })
  language!: LanguageItem | null;

  /**
   * The work hour week this person belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem })
  @ManyToOne(() => WorkHourWeekItem, { nullable: true })
  workWeek!: WorkHourWeekItem | null;

  /**
   * Roles assigned to this person.
   */
  @ApiPropertyOptional({ type: () => RoleItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @ManyToMany(() => RoleItem)
  roles = new Collection<RoleItem>(this);

  /**
   * Tickets assigned to this person.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.assignee)
  assignedTickets = new Collection<TicketItem>(this);

  /**
   * Tickets created by this person.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.creator)
  createdTickets = new Collection<TicketItem>(this);

  /**
   * Notes created by this person.
   */
  @ApiPropertyOptional({ type: () => NoteItem, isArray: true })
  @OneToMany(() => NoteItem, (x) => x.person)
  notes = new Collection<NoteItem>(this);

  /**
   * Events this person is participating in.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @ManyToMany(() => EventItem)
  events = new Collection<EventItem>(this);

  /**
   * Dashboards owned by this person.
   */
  @ApiPropertyOptional({ type: () => DashboardItem, isArray: true })
  @OneToMany(() => DashboardItem, (dashboard) => dashboard.person)
  dashboards = new Collection<DashboardItem>(this);

  /**
   * Favorite items referencing this person.
   */
  @ApiPropertyOptional({ type: () => FavoriteItem, isArray: true })
  @OneToMany(() => FavoriteItem, (favorite) => favorite.person)
  favorites = new Collection<FavoriteItem>(this);

  /**
   * Session associated with this person (OneToOne).
   */
  @ApiPropertyOptional({ type: () => PersonSessionItem })
  @Sapling(['isHideAsReference'])
  @OneToOne(() => PersonSessionItem, (session) => session.person)
  session?: PersonSessionItem;
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
