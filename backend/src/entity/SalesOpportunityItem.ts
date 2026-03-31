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
import { SalesOpportunityTypeItem } from './SalesOpportunityTypeItem';
import { EventItem } from './EventItem';
import { Sapling } from './global/entity.decorator';
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
 * @property {SalesOpportunityTypeItem} type - Type of the sales opportunity.
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
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Detailed description of the sales opportunity.
   */
  @ApiPropertyOptional()
  @Property({ length: 1024, nullable: true })
  description?: string;

  /**
   * Expected revenue for the sales opportunity.
   */
  @ApiPropertyOptional({ type: 'number' })
  @Sapling(['isMoney'])
  @Property({ nullable: true, type: 'float' })
  expectedRevenue?: number;

  /**
   * Probability of closing the sales opportunity (percentage).
   */
  @ApiPropertyOptional({ type: 'number' })
  @Sapling(['isPercent'])
  @Property({ nullable: true, type: 'float' })
  probability?: number;

  /**
   * Expected close date for the sales opportunity.
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, type: 'date' })
  closeDate?: Date;

  /**
   * Next step for the sales opportunity.
   */
  @ApiPropertyOptional({ type: 'string' })
  @Property({ length: 256, nullable: true })
  nextStep?: string;

  /**
   * Pain points related to the sales opportunity.
   */
  @ApiPropertyOptional({ type: 'string' })
  @Property({ length: 512, nullable: true })
  painPoints?: string;

  /**
   * Indicates whether the sales opportunity is active.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive?: boolean = true;
  //#endregion

  //#region Properties: Relation
  /**
   * Type of the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityTypeItem })
  @Sapling(['isChip'])
  @ManyToOne(() => SalesOpportunityTypeItem, {
    defaultRaw: `'new'`,
    nullable: false,
  })
  type!: SalesOpportunityTypeItem;

  /**
   * Forecast type of the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityForecastItem })
  @Sapling(['isChip'])
  @ManyToOne(() => SalesOpportunityForecastItem, {
    defaultRaw: `'pipeline'`,
    nullable: false,
  })
  forecast!: SalesOpportunityForecastItem;

  /**
   * Source of the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunitySourceItem })
  @ManyToOne(() => SalesOpportunitySourceItem, { nullable: false })
  source!: SalesOpportunitySourceItem;

  /**
   * Company associated with the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @ManyToOne(() => CompanyItem, { nullable: false })
  company!: Rel<CompanyItem>;

  /**
   * Person responsible for the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner'])
  @ManyToOne(() => PersonItem, { nullable: false })
  responsible!: Rel<PersonItem>;

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
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the sales opportunity was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
