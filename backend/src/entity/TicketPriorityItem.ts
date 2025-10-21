import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketPriorityItem {
  /**
   * Unique handle for the ticket priority (e.g., 'high', 'medium', 'low').
   */
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Description of the priority (display name).
   */
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Color code (e.g., hex or color name) for UI representation.
   */
  @Property({ length: 16, nullable: false })
  color!: string;

  /**
   * All tickets that have this priority.
   */
  @OneToMany(() => TicketItem, (x) => x.priority)
  tickets = new Collection<TicketItem>(this);

  // System fields

  /**
   * Date and time when the priority was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the priority was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
