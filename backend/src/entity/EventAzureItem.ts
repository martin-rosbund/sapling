import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { EventItem } from './EventItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing an Azure event, including persisted properties, relations, and system fields.
 *
 * @property        {string}        referenceHandle   Session number for the session (not primary key)
 * @property        {EventItem}     event             The event associated with this Azure item
 * @property        {Date}          createdAt         Date and time when the Azure event was created
 * @property        {Date}          updatedAt         Date and time when the Azure event was last updated
 */
@Entity()
export class EventAzureItem {
  // #region Properties: Persisted
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
   * The event associated with this Azure item.
   * @type {EventItem}
   */
  @ApiProperty({ type: () => EventItem })
  @OneToOne(() => EventItem, { primary: true, nullable: false })
  event!: EventItem;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the Azure event was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the Azure event was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
