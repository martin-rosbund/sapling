import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EventItem } from './EventItem';

@Entity()
export class EventStatusItem {
  //#region Properties: Persisted
  /**
   * Unique handle for the event status (e.g., 'scheduled', 'completed').
   */
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Description of the status (display name).
   */
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Color code (e.g., hex or color name) for UI representation.
   */
  @Property({ length: 16, nullable: false })
  color!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * All events that have this status.
   */
  @OneToMany(() => EventItem, (x) => x.status)
  events = new Collection<EventItem>(this);
  //#endregion

  //#region Properties: System
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
  //#endregion
}
