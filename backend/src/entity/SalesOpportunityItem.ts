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
  @ManyToOne(() => SalesOpportunityTypeItem, { nullable: false })
  type!: SalesOpportunityTypeItem;

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
   * Tickets associated with this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.handle)
  tickets = new Collection<TicketItem>(this);

  /**
   * Events associated with this sales opportunity.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (event) => event.handle)
  events = new Collection<EventItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
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
