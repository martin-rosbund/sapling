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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Start date and time of the event.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isShowInCompact'])
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date and time of the event.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isShowInCompact'])
  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  /**
   * Indicates if the event lasts all day.
   */
  @ApiProperty()
  @Property({ default: false, nullable: false })
  isAllDay!: boolean;

  /**
   * The person who created the event.
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  creator!: PersonItem;

  /**
   * Title of the event.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description of the event (optional).
   */
  @ApiProperty()
  @Property({ nullable: false, length: 1024 })
  description!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The type/category of the event.
   */
  @ApiProperty({ type: () => EventTypeItem })
  @ManyToOne(() => EventTypeItem, { defaultRaw: `'internal'`, nullable: false })
  type!: EventTypeItem;

  /**
   * The ticket associated with this event (optional).
   */
  @ApiPropertyOptional({ type: () => TicketItem })
  @ManyToOne(() => TicketItem, { nullable: true })
  ticket?: TicketItem;

  /**
   * Persons participating in this event.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem, (x) => x.events)
  participants = new Collection<PersonItem>(this);

  /**
   * The current status of the event.
   */
  @ApiProperty({ type: () => EventStatusItem })
  @ManyToOne(() => EventStatusItem, { defaultRaw: `'scheduled'`, nullable: false })
  status!: EventStatusItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the event was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the event was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
