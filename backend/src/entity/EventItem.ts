import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  OneToOne,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { EventTypeItem } from './EventTypeItem';
import { TicketItem } from './TicketItem';
import { EventStatusItem } from './EventStatusItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventAzureItem } from './EventAzureItem';
import { EventGoogleItem } from './EventGoogleItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { type Rel } from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a calendar event, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the event (primary key)
 * @property        {string}                title               Title of the event
 * @property        {CompanyItem}           assigneeCompany     The company assigned to this event (optional)
 * @property        {PersonItem}            assigneePerson      The person assigned to this event (optional)
 * @property        {CompanyItem}           creatorCompany      The company that created the event (optional)
 * @property        {PersonItem}            creatorPerson       The person who created the event (optional)
 * @property        {string}                description         Description of the event (optional)
 * @property        {Date}                  startDate           Start date and time of the event
 * @property        {Date}                  endDate             End date and time of the event
 * @property        {boolean}               isAllDay            Indicates if the event lasts all day
 * @property        {string}                onlineMeetingURL    URL for the online meeting (optional)
 * @property        {EventTypeItem}         type                The type/category of the event
 * @property        {TicketItem}            ticket              The ticket associated with this event (optional)
 * @property        {Collection<PersonItem>} participants       Persons participating in this event
 * @property        {SalesOpportunityItem}  salesOpportunity    Sales Opportunity related to this event (optional)
 * @property        {EventStatusItem}       status              The current status of the event
 * @property        {EventAzureItem}        azure               The Azure calendar item associated with this event (optional)
 * @property        {EventGoogleItem}       google              The Google calendar item associated with this event (optional)
 * @property        {Date}                  createdAt           Date and time when the event was created
 * @property        {Date}                  updatedAt           Date and time when the event was last updated
 */
@Entity()
export class EventItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the event (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the event.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'event.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description of the event (optional, markdown).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'event.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'text' })
  description?: string;

  /**
   * Start date and time of the event.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isOrderDESC', 'isToday', 'isDateStart', 'isValue'])
  @SaplingForm({
    order: 100,
    group: 'event.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date and time of the event.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isToday', 'isDateEnd', 'isValue'])
  @SaplingForm({
    order: 200,
    group: 'event.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  /**
   * Indicates if the event lasts all day.
   * @type {boolean}
   */
  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 300,
    group: 'event.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isAllDay!: boolean;

  /**
   * Indicates whether this event should only be visible to its creator.
   * Outlook imports set this from Microsoft Graph event sensitivity.
   * @type {boolean}
   */
  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 350,
    group: 'event.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 325,
    tableVisible: false,
    mobileOrder: 325,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isPrivate!: boolean;

  /**
   * RFC5545 recurrence rule describing a repeating series (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'event.groupSchedule',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 350,
    tableVisible: false,
    mobileOrder: 350,
    mobileVisible: false,
  })
  @Property({ nullable: true, length: 512 })
  recurrenceRule?: string | null;

  /**
   * URL for the online meeting (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isLink'])
  @SaplingForm({
    order: 100,
    group: 'event.groupContact',
    groupOrder: 400,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, length: 512 })
  onlineMeetingURL?: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The type/category of the event.
   * @type {EventTypeItem}
   */
  @ApiProperty({ type: () => EventTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'event.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => EventTypeItem, { defaultRaw: `'internal'`, nullable: false })
  type!: EventTypeItem;

  /**
   * Email address of the person who created the ticket.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMail', 'isReadOnly'])
  @Property({ persist: false, nullable: true, length: 128 })
  get creatorPersonEmail(): string | undefined {
    return this.creatorPerson?.email;
  }

  /**
   * Phone number of the person who created the ticket.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone', 'isReadOnly'])
  @Property({ persist: false, nullable: true, length: 128 })
  get creatorPersonPhone(): string | undefined {
    return this.creatorPerson?.phone;
  }

  /**
   * The company assigned to this event.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany'])
  @SaplingForm({
    order: 200,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => CompanyItem, { nullable: true })
  assigneeCompany?: Rel<CompanyItem>;
  /**
   * The person assigned to this event.
   * @type {PersonItem}
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingDependsOn({
    parentField: 'assigneeCompany',
    targetField: 'company',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 300,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  assigneePerson?: Rel<PersonItem>;

  /**
   * The company that created the event.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany'])
  @SaplingForm({
    order: 400,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => CompanyItem, { nullable: false })
  creatorCompany?: Rel<CompanyItem>;

  /**
   * The person who created the event.
   * @type {PersonItem}
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingDependsOn({
    parentField: 'creatorCompany',
    targetField: 'company',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 500,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: false,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  creatorPerson?: Rel<PersonItem>;

  /**
   * The ticket associated with this event (optional).
   * @type {TicketItem}
   */
  @ApiPropertyOptional({ type: () => TicketItem })
  @SaplingForm({
    order: 600,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 600,
    tableVisible: false,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @ManyToOne(() => TicketItem, { nullable: true })
  ticket?: Rel<TicketItem>;

  /**
   * Persons participating in this event.
   * @type {Collection<PersonItem>}
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem, (x) => x.events)
  participants: Collection<PersonItem> = new Collection<PersonItem>(this);

  /**
   * Sales Opportunity related to this ticket.
   * @type {SalesOpportunityItem}
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem })
  @SaplingForm({
    order: 700,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 700,
    tableVisible: false,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @ManyToOne(() => SalesOpportunityItem, { nullable: true })
  salesOpportunity?: SalesOpportunityItem;

  /**
   * The current status of the event.
   * @type {EventStatusItem}
   */
  @ApiProperty({ type: () => EventStatusItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'event.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => EventStatusItem, {
    defaultRaw: `'scheduled'`,
    nullable: false,
  })
  status!: EventStatusItem;

  /**
   * The Azure calendar item associated with this event (optional).
   * @type {EventAzureItem}
   */
  @ApiPropertyOptional({ type: () => EventAzureItem })
  @Sapling(['isHideAsReference'])
  @SaplingForm({
    order: 900,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: false,
    tableOrder: 900,
    tableVisible: false,
    mobileOrder: 900,
    mobileVisible: false,
  })
  @OneToOne(() => EventAzureItem, (x) => x.event)
  azure?: EventAzureItem;

  /**
   * The Google calendar item associated with this event (optional).
   * @type {EventGoogleItem}
   */
  @ApiPropertyOptional({ type: () => EventGoogleItem })
  @Sapling(['isHideAsReference'])
  @SaplingForm({
    order: 1000,
    group: 'event.groupReference',
    groupOrder: 500,
    width: 2,
    visible: false,
    tableOrder: 1000,
    tableVisible: false,
    mobileOrder: 1000,
    mobileVisible: false,
  })
  @OneToOne(() => EventGoogleItem, (x) => x.event)
  google?: EventGoogleItem;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the event was created.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the event was last updated.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
