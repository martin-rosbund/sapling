import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a webhook subscription method, including persisted properties, relations, and system fields.
 *
 * @property        {string}                handle              Unique identifier for the webhook subscription method (primary key)
 * @property        {string}                description         Name of the webhook subscription method
 * @property        {string}                icon                Icon representing the webhook subscription method
 * @property        {string}                color               Color associated with the webhook subscription method
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions Webhook subscriptions belonging to this method
 * @property        {Date}                  createdAt           Date and time when the method was created
 * @property        {Date}                  updatedAt           Date and time when the method was last updated
 */
@Entity()
export class WebhookSubscriptionMethodItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the webhook subscription method (primary key).
   * @type {string}
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Name of the webhook subscription method.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Icon representing the webhook subscription method.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color associated with the webhook subscription method.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color?: string = '#4CAF50';
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this method.
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.method)
  subscriptions = new Collection<WebhookSubscriptionItem>(this);
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
