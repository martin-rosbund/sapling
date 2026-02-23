import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { CompanyItem } from './CompanyItem';
import { TicketItem } from './TicketItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesOpportunityTypeItem } from './SalesOpportunityTypeItem';
import { EventItem } from './EventItem';
import { Sapling } from './global/entity.decorator';
import { SalesOpportunityForecastItem } from './SalesOpportunityForecastItem';
import { SalesOpportunitySourceItem } from './SalesOpportunitySourceItem';

/**
 * Entity representing a sales opportunity.
 * Contains details, type, status, relations to company, person, ticket, calendar.
 */
@Entity()
export class SalesOpportunityItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the sales opportunity (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
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
  @Property({ nullable: true, type: 'float' })
  expectedRevenue?: number;

  /**
   * Probability of closing the sales opportunity (percentage).
   */
  @ApiPropertyOptional({ type: 'number' })
  @Property({ nullable: true, type: 'float' })
  probability?: number;

  /**
   * Expected close date for the sales opportunity.
   */
  @ApiPropertyOptional({
    type: 'string',
    format: 'date',
    description: 'Expected close date',
  })
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
  @ManyToOne(() => CompanyItem, { nullable: false })
  company!: CompanyItem;

  /**
   * Person responsible for the sales opportunity.
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @ManyToOne(() => PersonItem, { nullable: false })
  responsible!: PersonItem;

  /**
   * Tickets related to this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.salesOpportunity)
  tickets = new Collection<TicketItem>(this);

  /**
   * Events associated with this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (event) => event.salesOpportunity)
  events = new Collection<EventItem>(this);
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
