import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { TicketStatusItem } from './TicketStatusItem';
import { TicketPriorityItem } from './TicketPriorityItem';
import { TicketTimeTrackingItem } from './TicketTimeTracking';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
/**
 * Entity representing a support or service ticket.
 * Contains ticket details, status, priority, assignee, creator, and related time tracking.
 */
@Entity()
export class TicketItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the ticket (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title or short summary of the ticket.
   */
  @ApiPropertyOptional()
  @Sapling(['isShowInCompact', 'isReadOnly'])
  @Property({ length: 32, nullable: false })
  number!: string;

  /**
   * Title or short summary of the ticket.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Detailed description of the problem.
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 1024 })
  problemDescription?: string;

  /**
   * Detailed description of the solution.
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 1024 })
  solutionDescription?: string;

  /**
   * Start date of the ticket.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date of the ticket.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  endDate!: Date;

  /**
   * Deadline date for the ticket.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  deadlineDate!: Date;
  //#endregion

  //#region Properties: Relation
  /**
   * The person assigned to this ticket.
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @ManyToOne(() => PersonItem, { nullable: false })
  assignee?: PersonItem;

  /**
   * The person who created the ticket.
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  creator?: PersonItem;

  /**
   * The current status of the ticket.
   */
  @ApiProperty({ type: () => TicketStatusItem })
  @Sapling(['isChip'])
  @ManyToOne(() => TicketStatusItem)
  status!: TicketStatusItem;

  /**
   * The priority assigned to the ticket.
   */
  @ApiPropertyOptional({ type: () => TicketPriorityItem })
  @Sapling(['isChip'])
  @ManyToOne(() => TicketPriorityItem, { nullable: true })
  priority?: TicketPriorityItem;

  /**
   * Time tracking entries for this ticket.
   */
  @ApiPropertyOptional({ type: () => TicketTimeTrackingItem, isArray: true })
  @OneToMany(() => TicketTimeTrackingItem, (x) => x.ticket)
  timeTrackings = new Collection<TicketTimeTrackingItem>(this);
  //#endregion

  //#region Properties: System
  // System fields
  /**
   * Date and time when the ticket was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date = new Date();

  /**
   * Date and time when the ticket was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
  //#endregion
}
