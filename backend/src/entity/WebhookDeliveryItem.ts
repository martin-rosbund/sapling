import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookDeliveryStatusItem } from './WebhookDeliveryStatusItem';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a webhook delivery, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the webhook delivery (primary key)
 * @property        {object}                payload             Payload of the webhook delivery
 * @property        {object}                requestHeaders      Optional request headers for the webhook delivery
 * @property        {number}                responseStatusCode  Response status code of the webhook delivery
 * @property        {object}                responseBody        Response body of the webhook delivery
 * @property        {object}                responseHeaders     Optional response headers for the webhook delivery
 * @property        {Date}                  completedAt         Date and time when the delivery was completed
 * @property        {number}                attemptCount        Number of delivery attempts made
 * @property        {Date}                  nextRetryAt         Date and time for the next retry attempt
 * @property        {WebhookDeliveryStatusItem} status           Status of the webhook delivery
 * @property        {WebhookSubscriptionItem} subscription      Type of the webhook subscription
 * @property        {Date}                  createdAt           Date and time when the delivery was created
 * @property        {Date}                  updatedAt           Date and time when the delivery was last updated
 */
@Entity()
export class WebhookDeliveryItem {
  // #region Properties: Relation
  /**
   * Status of the webhook delivery.
   * @type {WebhookDeliveryStatusItem}
   */
  @ApiPropertyOptional({
    type: () => WebhookDeliveryStatusItem,
    default: 'pending',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookDeliveryStatusItem, {
    defaultRaw: `'pending'`,
    nullable: true,
  })
  status?: WebhookDeliveryStatusItem;

  /**
   * Type of the webhook subscription.
   * @type {WebhookSubscriptionItem}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem })
  @ManyToOne(() => WebhookSubscriptionItem, { nullable: false })
  subscription!: Rel<WebhookSubscriptionItem>;
  // #endregion

  // #region Properties: Persisted
  /**
   * Unique identifier for the webhook delivery (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Payload of the webhook delivery.
   * @type {object}
   */
  @ApiProperty()
  @Property({ type: 'json', nullable: false })
  payload!: object;

  /**
   * Optional request headers for the webhook delivery.
   * @type {object}
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  requestHeaders?: object;

  /**
   * Response status code of the webhook delivery.
   * @type {number}
   */
  @ApiProperty()
  @Property({ default: 200, nullable: true })
  responseStatusCode?: number = 200;

  /**
   * Response body of the webhook delivery.
   * @type {object}
   */
  @ApiProperty()
  @Property({ type: 'json', nullable: true })
  responseBody?: object;

  /**
   * Optional response headers for the webhook delivery.
   * @type {object}
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  responseHeaders?: object;

  /**
   * Date and time when the delivery was completed.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date;

  /**
   * Number of delivery attempts made.
   * @type {number}
   */
  @ApiProperty()
  @Property({ default: 0, nullable: false })
  attemptCount!: number;

  /**
   * Date and time for the next retry attempt.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  nextRetryAt?: Date;

  // #endregion

  // #region Properties: System
  /**
   * Date and time when the delivery was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the delivery was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
