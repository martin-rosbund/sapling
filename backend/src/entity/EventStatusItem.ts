import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { EventItem } from './EventItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing an event status, including persisted properties, relations, and system fields.
 *
 * @property        {string}                    handle      Unique handle for the event status (e.g., 'scheduled', 'completed')
 * @property        {string}                    description Description of the status (display name)
 * @property        {string}                    color       Color code (e.g., hex or color name) for UI representation
 * @property        {Collection<EventItem>}     events      All events that have this status
 * @property        {Date}                      createdAt   Date and time when the event status was created
 * @property        {Date}                      updatedAt   Date and time when the event status was last updated
 */
@Entity()
export class EventStatusItem {
  // #region Properties: Persisted
  /**
   * Unique handle for the event status (e.g., 'scheduled', 'completed').
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Description of the status (display name).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({ order: 100, group: 'eventStatus.groupContent', width: 4 })
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Color code (e.g., hex or color name) for UI representation.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({ order: 100, group: 'eventStatus.groupAppearance', width: 1 })
  @Property({ length: 16, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * All events that have this status.
   * @type {Collection<EventItem>}
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (x) => x.status)
  events: Collection<EventItem> = new Collection<EventItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the event status was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the event status was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
