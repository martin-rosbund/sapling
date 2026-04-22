import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { TicketItem } from './TicketItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a time tracking entry for a ticket, including persisted properties, relations, and system fields.
 *
 * @property        {number}        handle        Unique identifier for the time tracking entry (primary key)
 * @property        {string}        title         Title of the time tracking entry
 * @property        {string}        description   Description of the work performed (markdown)
 * @property        {PersonItem}    person        Person who performed the work
 * @property        {TicketItem}    ticket        Ticket to which this time entry belongs
 * @property        {Date}          startTime     Start time of the tracked work interval
 * @property        {Date}          endTime       End time of the tracked work interval
 * @property        {Date}          createdAt     Date and time when the time tracking entry was created
 * @property        {Date}          updatedAt     Date and time when the time tracking entry was last updated
 */
@Entity()
export class TicketTimeTrackingItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the time tracking entry.
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;
  //#endregion

  //#region Properties: Relation
  /**
   * Title of the time tracking entry.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'ticketTimeTracking.groupBasics',
    width: 2,
  })
  @Property({ length: 64, nullable: false })
  title!: string;

  /**
   * Description of the work performed (markdown).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'ticketTimeTracking.groupContent',
    width: 4,
  })
  @Property({ length: 256, nullable: false })
  description!: string;

  /**
   * Person who performed the work.
   * @type {PersonItem}
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 100,
    group: 'ticketTimeTracking.groupReference',
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  /**
   * Ticket to which this time entry belongs.
   * @type {TicketItem}
   */
  @ApiProperty({ type: () => TicketItem })
  @SaplingForm({
    order: 200,
    group: 'ticketTimeTracking.groupReference',
    width: 2,
  })
  @ManyToOne(() => TicketItem, { nullable: false })
  ticket!: Rel<TicketItem>;
  //#endregion

  //#region Properties: Persisted
  /**
   * Start time of the tracked work interval.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isShowInCompact', 'isToday'])
  @SaplingForm({
    order: 100,
    group: 'ticketTimeTracking.groupSchedule',
    width: 1,
  })
  @Property({ type: 'datetime', nullable: false })
  startTime!: Date;

  /**
   * End time of the tracked work interval.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isShowInCompact', 'isToday'])
  @SaplingForm({
    order: 200,
    group: 'ticketTimeTracking.groupSchedule',
    width: 1,
  })
  @Property({ type: 'datetime', nullable: false })
  endTime!: Date;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the time tracking entry was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the time tracking entry was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
