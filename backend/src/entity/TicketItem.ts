import { Collection } from '@mikro-orm/core';
import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { TicketStatusItem } from './TicketStatusItem';
import { TicketPriorityItem } from './TicketPriorityItem';
import { TicketTimeTrackingItem } from './TicketTimeTracking';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventItem } from './EventItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { type Rel } from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';
import { ContractItem } from './ContractItem';
import { SlaPolicyItem } from './SlaPolicyItem';
import { SupportQueueItem } from './SupportQueueItem';
import { SupportTeamItem } from './SupportTeamItem';
import { TicketCategoryItem } from './TicketCategoryItem';
import { TicketSourceItem } from './TicketSourceItem';
import { TicketTypeItem } from './TicketTypeItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a support or service ticket, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the ticket (primary key)
 * @property        {string}                number              Ticket number or short summary (optional)
 * @property        {string}                externalNumber      External number or reference for the ticket (optional)
 * @property        {string}                title               Title or short summary of the ticket
 * @property        {string}                problemDescription  Detailed description of the problem (optional, markdown)
 * @property        {string}                solutionDescription Detailed description of the solution (optional, markdown)
 * @property        {Date}                  startDate           Start date of the ticket
 * @property        {Date}                  endDate             End date of the ticket (optional)
 * @property        {Date}                  deadlineDate        Deadline date for the ticket (optional)
 * @property        {PersonItem}            assignee            The person assigned to this ticket
 * @property        {PersonItem}            creator             The person who created the ticket
 * @property        {TicketStatusItem}      status              The current status of the ticket
 * @property        {TicketPriorityItem}    priority            The priority assigned to the ticket
 * @property        {SalesOpportunityItem}  salesOpportunity    Sales Opportunity related to this ticket (optional)
 * @property        {Collection<TicketTimeTrackingItem>} timeTrackings Time tracking entries for this ticket
 * @property        {Collection<EventItem>} events              Event entries for this ticket
 * @property        {Date}                  createdAt           Date and time when the ticket was created
 * @property        {Date}                  updatedAt           Date and time when the ticket was last updated
 */
@Entity()
export class TicketItem {
  // #region Group: Basics
  /**
   * Ticket number or short summary (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isShowInCompact', 'isReadOnly', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'ticket.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ length: 32, nullable: true })
  number!: string;

  /**
   * Title or short summary of the ticket.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isDuplicateCheck'])
  @SaplingForm({
    order: 300,
    group: 'ticket.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * The current status of the ticket.
   * @type {TicketStatusItem}
   */
  @ApiProperty({ type: () => TicketStatusItem, default: 'open' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 400,
    group: 'ticket.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => TicketStatusItem, { default: 'open', nullable: false })
  status!: TicketStatusItem;

  /**
   * The priority assigned to the ticket.
   * @type {TicketPriorityItem}
   */
  @ApiPropertyOptional({ type: () => TicketPriorityItem, default: 'normal' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 500,
    group: 'ticket.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => TicketPriorityItem, { default: 'normal', nullable: false })
  priority!: TicketPriorityItem;

  /**
   * External number or reference for the ticket (optional).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isDuplicateCheck'])
  @SaplingForm({
    order: 200,
    group: 'ticket.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ length: 128, nullable: true })
  externalNumber?: string;
  // #endregion

  // #region Group: Content
  /**
   * Detailed description of the problem (optional, markdown).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'ticket.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, length: 1024 })
  problemDescription?: string;

  /**
   * Detailed description of the solution (optional, markdown).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'ticket.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, length: 1024 })
  solutionDescription?: string;
  // #endregion

  // #region Group: Schedule
  /**
   * Start date of the ticket.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isToday', 'isDateStart'])
  @SaplingForm({
    order: 100,
    group: 'ticket.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date of the ticket (optional).
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isDateEnd'])
  @SaplingForm({
    order: 200,
    group: 'ticket.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  endDate!: Date;

  /**
   * Deadline date for the ticket (optional).
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isOrderASC', 'isDeadline'])
  @SaplingForm({
    order: 300,
    group: 'ticket.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  deadlineDate!: Date;
  // #endregion

  // #region Group: Reference
  /**
   * The company assigned to this ticket.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany'])
  @SaplingForm({
    order: 300,
    group: 'ticket.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => CompanyItem, { nullable: true })
  assigneeCompany?: Rel<CompanyItem>;

  /**
   * The person assigned to this ticket.
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
    order: 600,
    group: 'ticket.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  assigneePerson?: Rel<PersonItem>;

  /**
   * The company that created the ticket.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany'])
  @SaplingForm({
    order: 700,
    group: 'ticket.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => CompanyItem, { nullable: false })
  creatorCompany?: Rel<CompanyItem>;

  /**
   * The person who created the ticket.
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
    order: 800,
    group: 'ticket.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  creatorPerson?: Rel<PersonItem>;

  /**
   * Sales Opportunity related to this ticket (optional).
   * @type {SalesOpportunityItem}
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem })
  @SaplingForm({
    order: 900,
    group: 'ticket.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => SalesOpportunityItem, { nullable: true })
  salesOpportunity?: SalesOpportunityItem;
  // #endregion

  // #region Group: SLA
  /**
   * Active SLA policy used to calculate deadlines for this ticket.
   * @type {SlaPolicyItem}
   */
  @ApiPropertyOptional({ type: () => SlaPolicyItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'ticket.groupSla',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => SlaPolicyItem, { nullable: true })
  slaPolicy?: Rel<SlaPolicyItem>;

  /**
   * Deadline for the first response.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDeadline'])
  @SaplingForm({
    order: 200,
    group: 'ticket.groupSla',
    groupOrder: 500,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  firstResponseDueAt?: Date;

  /**
   * Deadline for the overall solution.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDeadline'])
  @SaplingForm({
    order: 300,
    group: 'ticket.groupSla',
    groupOrder: 500,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  resolutionDueAt?: Date;

  /**
   * Actual timestamp of the first response.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDateStart'])
  @SaplingForm({
    order: 400,
    group: 'ticket.groupSla',
    groupOrder: 500,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  firstRespondedAt?: Date;

  /**
   * Actual timestamp at which the ticket was resolved.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDateEnd'])
  @SaplingForm({
    order: 500,
    group: 'ticket.groupSla',
    groupOrder: 500,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  resolvedAt?: Date;
  // #endregion

  // #region Group: Support
  /**
   * The support process type of the ticket.
   * @type {TicketTypeItem}
   */
  @ApiPropertyOptional({ type: () => TicketTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'ticket.groupSupport',
    groupOrder: 450,
    width: 1,
  })
  @ManyToOne(() => TicketTypeItem, { default: 'incident', nullable: false })
  type!: Rel<TicketTypeItem>;

  /**
   * Optional ticket category within the selected ticket type.
   * @type {TicketCategoryItem}
   */
  @ApiPropertyOptional({ type: () => TicketCategoryItem })
  @Sapling(['isChip'])
  @SaplingDependsOn({
    parentField: 'type',
    targetField: 'type',
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 200,
    group: 'ticket.groupSupport',
    groupOrder: 450,
    width: 1,
  })
  @ManyToOne(() => TicketCategoryItem, { nullable: true })
  category?: Rel<TicketCategoryItem>;

  /**
   * Inbound source from which the ticket entered the support process.
   * @type {TicketSourceItem}
   */
  @ApiPropertyOptional({ type: () => TicketSourceItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'ticket.groupSupport',
    groupOrder: 450,
    width: 1,
  })
  @ManyToOne(() => TicketSourceItem, { default: 'email', nullable: false })
  source!: Rel<TicketSourceItem>;

  /**
   * Support team currently responsible for the ticket.
   * @type {SupportTeamItem}
   */
  @ApiPropertyOptional({ type: () => SupportTeamItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 400,
    group: 'ticket.groupSupport',
    groupOrder: 450,
    width: 1,
  })
  @ManyToOne(() => SupportTeamItem, { nullable: true })
  supportTeam?: Rel<SupportTeamItem>;

  /**
   * Support queue currently responsible for the ticket.
   * @type {SupportQueueItem}
   */
  @ApiPropertyOptional({ type: () => SupportQueueItem })
  @Sapling(['isChip'])
  @SaplingDependsOn({
    parentField: 'supportTeam',
    targetField: 'team',
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 500,
    group: 'ticket.groupSupport',
    groupOrder: 450,
    width: 1,
  })
  @ManyToOne(() => SupportQueueItem, { nullable: true })
  supportQueue?: Rel<SupportQueueItem>;

  /**
   * Contract that governs the support case.
   * @type {ContractItem}
   */
  @ApiPropertyOptional({ type: () => ContractItem })
  @SaplingDependsOn({
    parentField: 'creatorCompany',
    targetField: 'company',
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 50,
    group: 'ticket.groupSupport',
    groupOrder: 450,
    width: 1,
  })
  @ManyToOne(() => ContractItem, { nullable: true })
  contract?: Rel<ContractItem>;
  // #endregion

  // #region Without group
  /**
   * Unique identifier for the ticket (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

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
   * Time tracking entries for this ticket.
   * @type {Collection<TicketTimeTrackingItem>}
   */
  @ApiPropertyOptional({ type: () => TicketTimeTrackingItem, isArray: true })
  @OneToMany(() => TicketTimeTrackingItem, (x) => x.ticket)
  timeTrackings: Collection<TicketTimeTrackingItem> =
    new Collection<TicketTimeTrackingItem>(this);

  /**
   * Event entries for this ticket.
   * @type {Collection<EventItem>}
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (x) => x.ticket)
  events: Collection<EventItem> = new Collection<EventItem>(this);

  /**
   * Date and time when the ticket was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the ticket was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
