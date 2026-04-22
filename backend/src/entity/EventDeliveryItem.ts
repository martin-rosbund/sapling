import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventItem } from './EventItem';
import { EventDeliveryStatusItem } from './EventDeliveryStatusItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a webhook delivery, including persisted properties, relations, and system fields.
 *
 * @property        {EventDeliveryStatusItem}  status              Status of the webhook delivery
 * @property        {EventItem}                event               Type of the webhook subscription
 * @property        {number}                   handle              Unique identifier for the webhook subscription (primary key)
 * @property        {object}                   payload             Payload of the webhook delivery
 * @property        {object}                   requestHeaders      Optional query parameter (nullable)
 * @property        {number}                   responseStatusCode  Response status code of the webhook delivery
 * @property        {object}                   responseBody        Response body of the webhook delivery
 * @property        {object}                   responseHeaders     Optional query parameter (nullable)
 * @property        {Date}                     completedAt         Date and time when the delivery was completed
 * @property        {number}                   attemptCount        Number of delivery attempts made
 * @property        {Date}                     nextRetryAt         Date and time for the next retry attempt
 * @property        {Date}                     createdAt           Date and time when the delivery was created
 * @property        {Date}                     updatedAt           Date and time when the delivery was last updated
 */
@Entity()
export class EventDeliveryItem {
  // #region Properties: Relation
  /**
   * Status of the webhook delivery.
   * @type {EventDeliveryStatusItem}
   */
  @ApiPropertyOptional({
    type: () => EventDeliveryStatusItem,
    default: 'pending',
  })
  @Sapling(['isChip'])
  @SaplingForm({ order: 100, group: 'eventDelivery.groupReference', width: 1 })
  @ManyToOne(() => EventDeliveryStatusItem, {
    defaultRaw: `'pending'`,
    nullable: true,
  })
  status?: EventDeliveryStatusItem;

  /**
   * Type of the webhook subscription.
   * @type {EventItem}
   */
  @ApiPropertyOptional({ type: () => EventItem })
  @SaplingForm({ order: 200, group: 'eventDelivery.groupReference', width: 2 })
  @ManyToOne(() => EventItem, { nullable: false })
  event!: EventItem;
  // #endregion

  // #region Properties: Persisted
  /**
   * Unique identifier for the webhook subscription (primary key).
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
  @SaplingForm({ order: 100, group: 'eventDelivery.groupContent', width: 4 })
  @Property({ type: 'json', nullable: false })
  payload!: object;

  /**
   * Optional query parameter (nullable).
   * @type {object}
   */
  @ApiPropertyOptional()
  @SaplingForm({ order: 200, group: 'eventDelivery.groupContent', width: 4 })
  @Property({ type: 'json', nullable: true })
  requestHeaders?: object;

  /**
   * Response status code of the webhook delivery.
   * @type {number}
   */
  @ApiProperty()
  @SaplingForm({ order: 100, group: 'eventDelivery.groupBasics', width: 1 })
  @Property({ default: 200, nullable: true })
  responseStatusCode?: number;

  /**
   * Response body of the webhook delivery.
   * @type {object}
   */
  @ApiProperty()
  @SaplingForm({ order: 300, group: 'eventDelivery.groupContent', width: 4 })
  @Property({ type: 'json', nullable: true })
  responseBody?: object;

  /**
   * Optional query parameter (nullable).
   * @type {object}
   */
  @ApiPropertyOptional()
  @SaplingForm({ order: 400, group: 'eventDelivery.groupContent', width: 4 })
  @Property({ type: 'json', nullable: true })
  responseHeaders?: object;

  /**
   * Date and time when the delivery was completed.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({ order: 100, group: 'eventDelivery.groupSchedule', width: 1 })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date;

  /**
   * Number of delivery attempts made.
   * @type {number}
   */
  @ApiProperty()
  @SaplingForm({ order: 200, group: 'eventDelivery.groupBasics', width: 1 })
  @Property({ default: 0, nullable: false })
  attemptCount!: number;

  /**
   * Date and time for the next retry attempt.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({ order: 200, group: 'eventDelivery.groupSchedule', width: 1 })
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
