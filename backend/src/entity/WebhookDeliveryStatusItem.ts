import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { WebhookDeliveryItem } from './WebhookDeliveryItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a webhook delivery status, including persisted properties, relations, and system fields.
 *
 * @property        {string}                handle              Unique identifier for the webhook delivery status (primary key)
 * @property        {string}                description         Name of the webhook delivery status
 * @property        {string}                icon                Icon representing the webhook delivery status
 * @property        {string}                color               Color associated with the webhook delivery status
 * @property        {Collection<WebhookDeliveryItem>} deliveries Webhook deliveries belonging to this delivery status
 * @property        {Date}                  createdAt           Date and time when the delivery status was created
 * @property        {Date}                  updatedAt           Date and time when the delivery status was last updated
 */
@Entity()
export class WebhookDeliveryStatusItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the webhook delivery status (primary key).
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
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Icon representing the webhook delivery status.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color associated with the webhook delivery status.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Webhook deliveries belonging to this delivery status.
   * @type {Collection<WebhookDeliveryItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookDeliveryItem, isArray: true })
  @OneToMany(() => WebhookDeliveryItem, (x) => x.status)
  deliveries: Collection<WebhookDeliveryItem> =
    new Collection<WebhookDeliveryItem>(this);
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
