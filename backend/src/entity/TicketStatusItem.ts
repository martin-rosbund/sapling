import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketStatusItem {
  /**
   * Unique handle for the ticket status (e.g., 'open', 'closed').
   */
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Description of the status (display name).
   */
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * All tickets that have this status.
   */
  @OneToMany(() => TicketItem, (x) => x.status)
  tickets = new Collection<TicketItem>(this);

  // System fields

  /**
   * Date and time when the status was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the status was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
