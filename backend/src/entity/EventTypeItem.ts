import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { EventItem } from './EventItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing an event type or category, including persisted properties, relations, and system fields.
 *
 * @property        {string}                    handle      Unique identifier for the event type (primary key)
 * @property        {string}                    title       Title or name of the event type
 * @property        {string}                    icon        Icon representing the event type (default: mdi-calendar)
 * @property        {string}                    color       Color used for displaying the event type (default: #4CAF50)
 * @property        {Collection<EventItem>}     events      Events belonging to this event type
 * @property        {Date}                      createdAt   Date and time when the event type was created
 * @property        {Date}                      updatedAt   Date and time when the event type was last updated
 */
@Entity()
export class EventTypeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the event type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Title or name of the event type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the event type (default: mdi-calendar).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color used for displaying the event type (default: #4CAF50).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Events belonging to this event type.
   * @type {Collection<EventItem>}
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (event) => event.type)
  events: Collection<EventItem> = new Collection<EventItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the event type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the event type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
