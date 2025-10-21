import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { EventItem } from './EventItem';

/**
 * Entity representing an event type or category.
 * Used to classify events and provide icons/colors for display.
 */
@Entity()
export class EventTypeItem {
  /**
   * Unique identifier for the event type (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title or name of the event type.
   */
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the event type (default: mdi-calendar).
   */
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon!: string | null;

  /**
   * Color used for displaying the event type (default: #4CAF50).
   */
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;

  // Relations

  /**
   * Events belonging to this event type.
   */
  @OneToMany(() => EventItem, (event) => event.type)
  events = new Collection<EventItem>(this);
}
