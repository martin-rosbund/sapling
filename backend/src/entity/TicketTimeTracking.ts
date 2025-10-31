import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketTimeTrackingItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the time tracking entry.
   */
  @PrimaryKey({ autoincrement: true })
  id!: number;
  //#endregion

  //#region Properties: Relation
  /**
   * Person who performed the work.
   */
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * Ticket to which this time entry belongs.
   */
  @ManyToOne(() => TicketItem, { nullable: false })
  ticket!: TicketItem;
  //#endregion

  //#region Properties: Persisted
  /**
   * Start time of the tracked work interval.
   */
  @Property({ type: 'datetime', nullable: false })
  von!: Date;

  /**
   * End time of the tracked work interval.
   */
  @Property({ type: 'datetime', nullable: false })
  bis!: Date;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the entry was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the entry was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
