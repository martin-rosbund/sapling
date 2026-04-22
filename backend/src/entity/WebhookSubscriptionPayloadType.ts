import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a webhook subscription payload type, including persisted properties, relations, and system fields.
 *
 * @property        {string}                handle              Unique identifier for the webhook subscription payload type (primary key)
 * @property        {string}                description         Name of the webhook subscription payload type
 * @property        {string}                icon                Icon representing the webhook subscription payload type
 * @property        {string}                color               Color associated with the webhook subscription payload type
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions Webhook subscriptions belonging to this payload type
 * @property        {Date}                  createdAt           Date and time when the payload type was created
 * @property        {Date}                  updatedAt           Date and time when the payload type was last updated
 */
@Entity()
export class WebhookSubscriptionPayloadType {
  //#region Properties: Persisted
  /**
   * Unique identifier for the webhook subscription payload type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Name of the webhook subscription payload type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'webhookSubscriptionPayloadType.groupContent',
    width: 4,
  })
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Icon representing the webhook subscription payload type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'webhookSubscriptionPayloadType.groupAppearance',
    width: 1,
  })
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color associated with the webhook subscription payload type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'webhookSubscriptionPayloadType.groupAppearance',
    width: 1,
  })
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color?: string = '#4CAF50';
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this payload type.
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.payloadType)
  subscriptions: Collection<WebhookSubscriptionItem> =
    new Collection<WebhookSubscriptionItem>(this);
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
