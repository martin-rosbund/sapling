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
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventItem } from './EventItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a support or service ticket, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the ticket (primary key)
 * @property        {string}                number              Ticket number or short summary (optional)
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
  // #region Properties: Persisted
  /**
   * Unique identifier for the ticket (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Ticket number or short summary (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isShowInCompact', 'isReadOnly', 'isDuplicateCheck'])
  @Property({ length: 32, nullable: true })
  number!: string;

  /**
   * Title or short summary of the ticket.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isDuplicateCheck'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Detailed description of the problem (optional, markdown).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @Property({ nullable: true, length: 1024 })
  problemDescription?: string;

  /**
   * Detailed description of the solution (optional, markdown).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @Property({ nullable: true, length: 1024 })
  solutionDescription?: string;

  /**
   * Start date of the ticket.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date of the ticket (optional).
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  endDate!: Date;

  /**
   * Deadline date for the ticket (optional).
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isOrderASC'])
  @Property({ nullable: true, type: 'datetime' })
  deadlineDate!: Date;
  // #endregion

  // #region Properties: Relation
  /**
   * The person assigned to this ticket.
   * @type {PersonItem}
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner'])
  @ManyToOne(() => PersonItem, { nullable: true })
  assignee?: Rel<PersonItem>;

  /**
   * The person who created the ticket.
   * @type {PersonItem}
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner'])
  @ManyToOne(() => PersonItem, { nullable: false })
  creator?: Rel<PersonItem>;

  /**
   * The current status of the ticket.
   * @type {TicketStatusItem}
   */
  @ApiProperty({ type: () => TicketStatusItem, default: 'open' })
  @Sapling(['isChip'])
  @ManyToOne(() => TicketStatusItem, { default: 'open', nullable: false })
  status!: TicketStatusItem;

  /**
   * The priority assigned to the ticket.
   * @type {TicketPriorityItem}
   */
  @ApiPropertyOptional({ type: () => TicketPriorityItem, default: 'normal' })
  @Sapling(['isChip'])
  @ManyToOne(() => TicketPriorityItem, { default: 'normal', nullable: false })
  priority!: TicketPriorityItem;

  /**
   * Sales Opportunity related to this ticket (optional).
   * @type {SalesOpportunityItem}
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem })
  @ManyToOne(() => SalesOpportunityItem, { nullable: true })
  salesOpportunity?: SalesOpportunityItem;

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
  // #endregion

  // #region Properties: System
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
