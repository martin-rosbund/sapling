import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Opt,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { TicketStatusItem } from './TicketStatusItem';
import { TicketPriorityItem } from './TicketPriorityItem';
import { TicketTimeTrackingItem } from './TicketTimeTracking';
/**
 * Entity representing a support or service ticket.
 * Contains ticket details, status, priority, assignee, creator, and related time tracking.
 */
@Entity()
export class TicketItem {
  // None persisted fields

  /**
   * Non-persisted field for ticket number.
   */
  @Property({ persist: false })
  get number(): Opt<string> {
    return (
      `${this.createdAt.getFullYear()}#` +
      (this.handle ?? 0).toString().padStart(5, '0')
    );
  }

  /**
   * Unique identifier for the ticket (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title or short summary of the ticket.
   */
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Detailed description of the problem.
   */
  @Property({ nullable: true, length: 1024 })
  problemDescription?: string;

  /**
   * Detailed description of the solution.
   */
  @Property({ nullable: true, length: 1024 })
  solutionDescription?: string;

  /**
   * Start date of the ticket.
   */
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date of the ticket.
   */
  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  /**
   * Deadline date for the ticket.
   */
  @Property({ nullable: false, type: 'datetime' })
  deadlineDate!: Date;

  // Relations

  /**
   * The person assigned to this ticket.
   */
  @ManyToOne(() => PersonItem, { nullable: true })
  assignee?: PersonItem;

  /**
   * The person who created the ticket.
   */
  @ManyToOne(() => PersonItem, { nullable: true })
  creator?: PersonItem;

  /**
   * The current status of the ticket.
   */
  @ManyToOne(() => TicketStatusItem)
  status!: TicketStatusItem;

  /**
   * The priority assigned to the ticket.
   */
  @ManyToOne(() => TicketPriorityItem, { nullable: true })
  priority?: TicketPriorityItem;

  /**
   * Time tracking entries for this ticket.
   */
  @OneToMany(() => TicketTimeTrackingItem, (x) => x.ticket)
  timeTrackings = new Collection<TicketTimeTrackingItem>(this);

  // System fields

  /**
   * Date and time when the ticket was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date = new Date();

  /**
   * Date and time when the ticket was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
