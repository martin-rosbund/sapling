import { Entity, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { EventItem } from './EventItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a Google event, including persisted properties, relations, and system fields.
 *
 * @property        {string}        referenceHandle   Session number for the session (not primary key)
 * @property        {EventItem}     event             The event associated with this Google item
 * @property        {Date}          createdAt         Date and time when the Google event was created
 * @property        {Date}          updatedAt         Date and time when the Google event was last updated
 */
@Entity()
export class EventGoogleItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the Google event (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Session number for the session (not primary key).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 128, nullable: false })
  referenceHandle!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The event associated with this Google item.
   * @type {EventItem}
   */
  @ApiProperty({ type: () => EventItem })
  @OneToOne(() => EventItem, { nullable: false, unique: true })
  event!: Rel<EventItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the Google event was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the Google event was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
