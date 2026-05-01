import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { ContractItem } from './ContractItem';
import { WorkHourWeekItem } from './WorkHourWeekItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountryItem } from './CountryItem';
import { CompanyRelationshipItem } from './CompanyRelationshipItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { TicketItem } from './TicketItem';
import { EventItem } from './EventItem';
import { ServerLandscapeItem } from './ServerLandscapeItem';
import { AddressItem } from './AddressItem';
import { HolidayGroupItem } from './HolidayGroupItem';

import { EMailListItem } from './EMailListItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a company, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the company (primary key)
 * @property        {string}                name                Name of the company (unique)
 * @property        {string}                street              Street address of the company
 * @property        {string}                zip                 ZIP or postal code
 * @property        {string}                city                City where the company is located
 * @property        {string}                phone               Company phone number
 * @property        {string}                mobile              Company mobile phone number
 * @property        {string}                email               Company email address
 * @property        {string}                website             Company website URL
 * @property        {boolean}               isActive            Indicates if the company is active
 * @property        {boolean}               allowNewsletter     Indicates if newsletters are allowed for the company
 * @property        {CountryItem}           country             Country associated with this company
 * @property        {Collection<PersonItem>} persons            Persons associated with this company
 * @property        {Collection<ContractItem>} contracts        Contracts associated with this company
 * @property        {Collection<ServerLandscapeItem>} serverLandscapes Server landscapes associated with this company
 * @property        {Collection<AddressItem>} addresses          Addresses associated with this company
 * @property        {Collection<SalesOpportunityItem>} salesOpportunities Sales opportunities associated with this company
 * @property        {WorkHourWeekItem}      workWeek            The work hour week this company uses (optional)
 * @property        {Collection<CompanyRelationshipItem>} outgoingRelationships Outgoing company relationships starting from this company
 * @property        {Collection<CompanyRelationshipItem>} incomingRelationships Incoming company relationships pointing to this company
 * @property        {Collection<CompanyItem>} serviceCustomer   Companies that are customers of this company as a service provider
 * @property        {CompanyItem}           serviceProvider     The service provider company associated with this company (optional)
 * @property        {Collection<TicketItem>} assignedTickets     Tickets assigned to this company
 * @property        {Collection<TicketItem>} createdTickets      Tickets created by this company
 * @property        {Collection<EventItem>} assignedEvents      Events assigned to this company
 * @property        {Collection<EventItem>} createdEvents       Events created by this company
 * @property        {Date}                  createdAt           Date and time when the company was created
 * @property        {Date}                  updatedAt           Date and time when the company was last updated
 */
@Entity()
export class CompanyItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the company (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Sapling(['isCompany'])
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  /**
   * Name of the company (must be unique).
   * @type {string}
   */
  @ApiProperty()
  @Sapling([
    'isShowInCompact',
    'isNavigation',
    'isOrderASC',
    'isDuplicateCheck',
  ])
  @SaplingForm({
    order: 100,
    group: 'company.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ unique: true, length: 128, nullable: false })
  name!: string;

  /**
   * Street address of the company.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isNavigation'])
  @SaplingForm({
    order: 100,
    group: 'company.groupAddress',
    groupOrder: 200,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  street!: string;

  /**
   * ZIP or postal code.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isNavigation'])
  @SaplingForm({
    order: 200,
    group: 'company.groupAddress',
    groupOrder: 200,
    width: 1,
  })
  @Property({ length: 16, nullable: true })
  zip?: string;

  /**
   * City where the company is located.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isNavigation'])
  @SaplingForm({
    order: 300,
    group: 'company.groupAddress',
    groupOrder: 200,
    width: 2,
  })
  @Property({ length: 64, nullable: true })
  city?: string;

  /**
   * Company phone number.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @SaplingForm({
    order: 100,
    group: 'company.groupContact',
    groupOrder: 300,
    width: 2,
  })
  @Property({ length: 32, nullable: true })
  phone?: string;

  /**
   * Company mobile phone number.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @SaplingForm({
    order: 200,
    group: 'company.groupContact',
    groupOrder: 300,
    width: 2,
  })
  @Property({ length: 32, nullable: true })
  mobile?: string;

  /**
   * Company email address.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMail'])
  @SaplingForm({
    order: 300,
    group: 'company.groupContact',
    groupOrder: 300,
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  email?: string;

  /**
   * Company website URL.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isLink'])
  @SaplingForm({
    order: 400,
    group: 'company.groupContact',
    groupOrder: 300,
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  website?: string;

  /**
   * Indicates if the company is active.
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'company.groupConfiguration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive?: boolean = true;

  /**
   * Indicates if newsletters are allowed for the company.
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'company.groupConfiguration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  allowNewsletter?: boolean = true;
  // #endregion

  // #region Properties: Relation
  /**
   * Country associated with this company.
   * @type {CountryItem}
   */
  @ApiPropertyOptional({
    type: () => CountryItem,
    default: 'DE',
  })
  @SaplingForm({
    order: 400,
    group: 'company.groupAddress',
    groupOrder: 200,
    width: 1,
  })
  @ManyToOne(() => CountryItem, {
    defaultRaw: `'DE'`,
    nullable: false,
  })
  country!: CountryItem;

  /**
   * Persons associated with this company.
   * @type {Collection<PersonItem>}
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (x) => x.company)
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);

  /**
   * Mail lists this company is assigned to.
   */
  @ApiPropertyOptional({ type: () => EMailListItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @ManyToMany(() => EMailListItem, (mailList) => mailList.companies)
  mailLists: Collection<EMailListItem> = new Collection<EMailListItem>(this);

  /**
   * Contracts associated with this company.
   * @type {Collection<ContractItem>}
   */
  @ApiPropertyOptional({ type: () => ContractItem, isArray: true })
  @OneToMany(() => ContractItem, (x) => x.company)
  contracts: Collection<ContractItem> = new Collection<ContractItem>(this);

  /**
   * Server landscapes associated with this company.
   * @type {Collection<ServerLandscapeItem>}
   */
  @ApiPropertyOptional({ type: () => ServerLandscapeItem, isArray: true })
  @OneToMany(() => ServerLandscapeItem, (x) => x.company)
  serverLandscapes: Collection<ServerLandscapeItem> =
    new Collection<ServerLandscapeItem>(this);

  /**
   * Addresses associated with this company.
   * @type {Collection<AddressItem>}
   */
  @ApiPropertyOptional({ type: () => AddressItem, isArray: true })
  @OneToMany(() => AddressItem, (x) => x.company)
  addresses: Collection<AddressItem> = new Collection<AddressItem>(this);

  /**
   * Tickets assigned to this company.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.assigneeCompany)
  assignedTickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  /**
   * Tickets created by this company.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => TicketItem, (x) => x.creatorCompany)
  createdTickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  /**
   * Tickets assigned to this company.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (x) => x.assigneeCompany)
  assignedEvents: Collection<EventItem> = new Collection<EventItem>(this);

  /**
   * Tickets created by this company.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => EventItem, (x) => x.creatorCompany)
  createdEvents: Collection<EventItem> = new Collection<EventItem>(this);

  /**
   * Sales opportunities assigned to this company.
   * @type {Collection<SalesOpportunityItem>}
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem, isArray: true })
  @OneToMany(() => SalesOpportunityItem, (x) => x.assigneeCompany)
  assignedSalesOpportunities: Collection<SalesOpportunityItem> =
    new Collection<SalesOpportunityItem>(this);

  /**
   * Sales opportunities created by this company.
   * @type {Collection<SalesOpportunityItem>}
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => SalesOpportunityItem, (x) => x.creatorCompany)
  createdSalesOpportunities: Collection<SalesOpportunityItem> =
    new Collection<SalesOpportunityItem>(this);

  /**
   * The work hour week this company uses (optional).
   * @type {WorkHourWeekItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem })
  @SaplingForm({
    order: 100,
    group: 'company.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => WorkHourWeekItem, { nullable: true })
  workWeek!: WorkHourWeekItem;

  /**
   * The holiday group this company uses (optional).
   * @type {HolidayGroupItem}
   */
  @ApiPropertyOptional({ type: () => HolidayGroupItem })
  @SaplingForm({
    order: 150,
    group: 'company.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => HolidayGroupItem, { nullable: true })
  holidayGroup?: HolidayGroupItem;

  /**
   * Outgoing company relationships starting from this company.
   * @type {Collection<CompanyRelationshipItem>}
   */
  @ApiPropertyOptional({ type: () => CompanyRelationshipItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => CompanyRelationshipItem, (x) => x.sourceCompany)
  outgoingRelationships: Collection<CompanyRelationshipItem> =
    new Collection<CompanyRelationshipItem>(this);

  /**
   * Incoming company relationships pointing to this company.
   * @type {Collection<CompanyRelationshipItem>}
   */
  @ApiPropertyOptional({ type: () => CompanyRelationshipItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => CompanyRelationshipItem, (x) => x.targetCompany)
  incomingRelationships: Collection<CompanyRelationshipItem> =
    new Collection<CompanyRelationshipItem>(this);

  /**
   * Companies that are customers of this company as a service provider.
   * @type {Collection<CompanyItem>}
   */
  @ApiPropertyOptional({ type: () => CompanyItem, isArray: true })
  @OneToMany(() => CompanyItem, (x) => x.serviceProvider)
  serviceCustomer: Collection<CompanyItem> = new Collection<CompanyItem>(this);

  /**
   * The service provider company associated with this company (optional).
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @SaplingForm({
    order: 200,
    group: 'company.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => CompanyItem, { nullable: true })
  serviceProvider!: CompanyItem;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the company was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the company was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
