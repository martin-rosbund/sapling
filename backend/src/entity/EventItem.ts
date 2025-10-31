import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { EventTypeItem } from './EventTypeItem';
import { TicketItem } from './TicketItem';
import { EventStatusItem } from './EventStatusItem';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing a calendar event.
 * Contains event details, participants, and relations to event type and tickets.
 */
@Entity()
export class EventItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the event (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Start date and time of the event.
   */
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date and time of the event.
   */
  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  /**
   * Indicates if the event lasts all day.
   */
  @Property({ default: false, nullable: false })
  isAllDay!: boolean;

  /**
   * The person who created the event.
   */
  @Sapling({ isPerson: true })
  @ManyToOne(() => PersonItem, { nullable: false })
  creator!: PersonItem;

  /**
   * Title of the event.
   */
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description of the event (optional).
   */
  @Property({ nullable: false, length: 1024 })
  description!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The type/category of the event.
   */
  @ManyToOne(() => EventTypeItem, { nullable: false })
  type!: EventTypeItem;

  /**
   * The ticket associated with this event (optional).
   */
  @ManyToOne(() => TicketItem, { nullable: true })
  ticket?: TicketItem;

  /**
   * Persons participating in this event.
   */
  @ManyToMany(() => PersonItem, (x) => x.events)
  participants = new Collection<PersonItem>(this);

  /**
   * The current status of the event.
   */
  @ManyToOne(() => EventStatusItem)
  status!: EventStatusItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the event was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the event was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
