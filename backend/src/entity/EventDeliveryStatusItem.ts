import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { EventDeliveryItem } from './EventDeliveryItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity defining the delivery statuses available for webhooks, including persisted properties, relations, and system fields.
 *
 * @property        {string}                        handle          Unique identifier for the webhook delivery status
 * @property        {string}                        description     Name of the webhook delivery status
 * @property        {string}                        icon            Icon representing the webhook delivery status
 * @property        {string}                        color           Color associated with the webhook delivery status
 * @property        {Collection<EventDeliveryItem>}  deliveries      Webhook deliveries belonging to this delivery status
 * @property        {Date}                          createdAt       Date and time when the delivery status was created
 * @property        {Date}                          updatedAt       Date and time when the delivery status was last updated
 */
@Entity()
export class EventDeliveryStatusItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the webhook delivery status.
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Name of the webhook delivery status.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'eventDeliveryStatus.groupContent',
    groupOrder: 100,
    width: 4,
  })
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Icon representing the webhook delivery status.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'eventDeliveryStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color associated with the webhook delivery status.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'eventDeliveryStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Webhook deliveries belonging to this delivery status.
   * @type {Collection<EventDeliveryItem>}
   */
  @ApiPropertyOptional({ type: () => EventDeliveryItem, isArray: true })
  @OneToMany(() => EventDeliveryItem, (x) => x.status)
  deliveries: Collection<EventDeliveryItem> = new Collection<EventDeliveryItem>(
    this,
  );
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the delivery status was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the delivery status was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
