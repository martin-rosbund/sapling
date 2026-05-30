import { Collection } from '@mikro-orm/core';
import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { CompanyItem } from './CompanyItem';
import { TicketItem } from './TicketItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesOpportunityStageItem } from './SalesOpportunityStageItem';
import { EventItem } from './EventItem';
import { EffortEstimateItem } from './EffortEstimateItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { SalesOpportunityForecastItem } from './SalesOpportunityForecastItem';
import { SalesOpportunitySourceItem } from './SalesOpportunitySourceItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class SalesOpportunityItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a sales opportunity.
 * @description Contains details, type, status, and relations to company, person, ticket, calendar, forecast, and source. Used to manage sales opportunities in the system.
 *
 * @property {number} handle - Unique identifier for the sales opportunity (primary key).
 * @property {string} title - Title or name of the sales opportunity.
 * @property {string} [description] - Detailed description of the sales opportunity.
 * @property {number} [expectedRevenue] - Expected revenue for the sales opportunity.
 * @property {number} [probability] - Probability of closing the sales opportunity (percentage).
 * @property {Date} [closeDate] - Expected close date for the sales opportunity.
 * @property {string} [nextStep] - Next step for the sales opportunity.
 * @property {string} [painPoints] - Pain points related to the sales opportunity.
 * @property {boolean} isActive - Indicates whether the sales opportunity is active.
 * @property {SalesOpportunityStageItem} type - Type of the sales opportunity.
 * @property {SalesOpportunityForecastItem} forecast - Forecast type of the sales opportunity.
 * @property {SalesOpportunitySourceItem} source - Source of the sales opportunity.
 * @property {CompanyItem} company - Company associated with the sales opportunity.
 * @property {PersonItem} responsible - Person responsible for the sales opportunity.
 * @property {Collection<TicketItem>} tickets - Tickets related to this sales opportunity.
 * @property {Collection<EventItem>} events - Events associated with this sales opportunity.
 * @property {Date} createdAt - Date and time when the sales opportunity was created.
 * @property {Date} updatedAt - Date and time when the sales opportunity was last updated.
 */
@Entity()
export class SalesOpportunityItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the sales opportunity (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title or name of the sales opportunity.
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'salesOpportunity.groupBasics',
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
   * Detailed description of the sales opportunity.
   */
  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'salesOpportunity.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'text' })
  description?: string;

  /**
   * Expected revenue for the sales opportunity.
   */
  @ApiPropertyOptional({ type: 'number' })
  @Sapling(['isMoney', 'isValue'])
  @SaplingForm({
    order: 200,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ nullable: true, type: 'float' })
  expectedRevenue?: number;

  /**
   * Probability of closing the sales opportunity (percentage).
   */
  @ApiPropertyOptional({ type: 'number' })
  @Sapling(['isPercent', 'isValue'])
  @SaplingForm({
    order: 300,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: true,
  })
  @Property({ nullable: true, type: 'float' })
  probability?: number;

  /**
   * Expected close date for the sales opportunity.
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 800,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 800,
    tableVisible: true,
    mobileOrder: 800,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'date' })
  closeDate?: Date;

  /**
   * Next step for the sales opportunity.
   */
  @ApiPropertyOptional({ type: 'string' })
  @SaplingForm({
    order: 400,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ length: 256, nullable: true })
  nextStep?: string;

  /**
   * Pain points related to the sales opportunity.
   */
  @ApiPropertyOptional({ type: 'string' })
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'salesOpportunity.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'text' })
  painPoints?: string;

  /**
   * Indicates whether the sales opportunity is active.
   */
  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'salesOpportunity.groupConfiguration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isActive?: boolean = true;
  //#endregion

  //#region Properties: Relation
  /**
   * Type of the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityStageItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 600,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @ManyToOne(() => SalesOpportunityStageItem, {
    defaultRaw: `'new'`,
    nullable: false,
  })
  type!: SalesOpportunityStageItem;

  /**
   * Forecast type of the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityForecastItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 700,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 700,
    tableVisible: true,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @ManyToOne(() => SalesOpportunityForecastItem, {
    defaultRaw: `'pipeline'`,
    nullable: false,
  })
  forecast!: SalesOpportunityForecastItem;

  /**
   * Source of the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunitySourceItem })
  @SaplingForm({
    order: 750,
    group: 'salesOpportunity.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 750,
    tableVisible: true,
    mobileOrder: 750,
    mobileVisible: false,
  })
  @ManyToOne(() => SalesOpportunitySourceItem, { nullable: false })
  source!: SalesOpportunitySourceItem;

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
   * The company assigned to this ticket.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany', 'isValue'])
  @SaplingForm({
    order: 400,
    group: 'salesOpportunity.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: true,
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
    order: 500,
    group: 'salesOpportunity.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
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
    order: 600,
    group: 'salesOpportunity.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: false,
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
    order: 700,
    group: 'salesOpportunity.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 700,
    tableVisible: true,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  creatorPerson?: Rel<PersonItem>;

  /**
   * Tickets related to this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.salesOpportunity)
  tickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  /**
   * Events associated with this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (event) => event.salesOpportunity)
  events: Collection<EventItem> = new Collection<EventItem>(this);

  /**
   * Effort estimates associated with this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => EffortEstimateItem, isArray: true })
  @OneToMany(
    () => EffortEstimateItem,
    (effortEstimate) => effortEstimate.salesOpportunity,
  )
  effortEstimates: Collection<EffortEstimateItem> =
    new Collection<EffortEstimateItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the sales opportunity was created.
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
