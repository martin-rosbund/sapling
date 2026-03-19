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
 * @summary         Entity representing a webhook authentication type, including persisted properties, relations, and system fields.
 *
 * @property        {string}                handle              Unique identifier for the webhook authentication type (primary key)
 * @property        {string}                description         Name of the webhook authentication type
 * @property        {string}                icon                Icon representing the webhook authentication type
 * @property        {string}                color               Color associated with the webhook authentication type
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions Webhook subscriptions belonging to this authentication type
 * @property        {Date}                  createdAt           Date and time when the authentication type was created
 * @property        {Date}                  updatedAt           Date and time when the authentication type was last updated
 */
@Entity()
export class WebhookAuthenticationTypeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the webhook authentication type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Name of the webhook authentication type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Icon representing the webhook authentication type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color associated with the webhook authentication type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Webhook subscriptions belonging to this authentication type.
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.authenticationType)
  subscriptions = new Collection<WebhookSubscriptionItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the authentication type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the authentication type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
