import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookDeliveryStatusItem } from './WebhookDeliveryStatusItem';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * Entity representing a webhook delivery.
 * Contains delivery details.
 */
@Entity()
export class WebhookDeliveryItem {
  //#region Properties: Relation
  /**
   * Status of the webhook delivery.
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
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem })
  @ManyToOne(() => WebhookSubscriptionItem, { nullable: false })
  subscription!: WebhookSubscriptionItem;
  //#endregion

  //#region Properties: Persisted
  /**
   * Unique identifier for the webhook subscription (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Payload of the webhook delivery.
   */
  @ApiProperty()
  @Property({ type: 'json', nullable: false })
  payload!: object;

  /**
   * Optional query parameter (nullable).
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  requestHeaders?: object;

  /**
   * Response status code of the webhook delivery.
   */
  @ApiProperty()
  @Property({ default: 200, nullable: true })
  responseStatusCode?: number = 200;

  /**
   * Response body of the webhook delivery.
   */
  @ApiProperty()
  @Property({ type: 'json', nullable: true })
  responseBody?: object;

  /**
   * Optional query parameter (nullable).
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  responseHeaders?: object;

  /**
   * Date and time when the delivery was completed.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date;

  /**
   * Number of delivery attempts made.
   */
  @ApiProperty()
  @Property({ default: 0, nullable: false })
  attemptCount!: number;

  /**
   * Date and time for the next retry attempt.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  nextRetryAt?: Date;

  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
