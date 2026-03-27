import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionTypeItem } from './WebhookSubscriptionTypeItem';
import { WebhookAuthenticationTypeItem } from './WebhookAuthenticationTypeItem';
import { WebhookAuthenticationOAuth2Item } from './WebhookAuthenticationOAuth2Item';
import { WebhookAuthenticationApiKeyItem } from './WebhookAuthenticationApiKeyItem';
import { WebhookDeliveryItem } from './WebhookDeliveryItem';
import { EntityItem } from './EntityItem';
import { WebhookSubscriptionMethodItem } from './WebhookSubscriptionMethodItem';
import { WebhookAuthenticationBasicItem } from './WebhookAuthenticationBasicItem';
import { WebhookSubscriptionPayloadType } from './WebhookSubscriptionPayloadType';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a webhook subscription, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the webhook subscription (primary key)
 * @property        {string}                description         Description of the webhook subscription
 * @property        {string}                url                 URL of the webhook subscription
 * @property        {object}                customHeaders       Optional custom headers for the webhook subscription
 * @property        {boolean}               isActive            Indicates whether the webhook subscription is active
 * @property        {string}                signingSecret       Signing secret for the webhook subscription
 * @property        {EntityItem}            entity              Entity associated with this webhook subscription
 * @property        {WebhookSubscriptionTypeItem} type           Type of the webhook subscription
 * @property        {WebhookSubscriptionPayloadType} payloadType Type of the webhook subscription payload
 * @property        {WebhookSubscriptionMethodItem} method       Method of the webhook subscription
 * @property        {WebhookAuthenticationTypeItem} authenticationType Authentication type of the webhook subscription
 * @property        {WebhookAuthenticationOAuth2Item} authenticationOAuth2 OAuth2 authentication for the webhook subscription
 * @property        {WebhookAuthenticationApiKeyItem} authenticationApiKey API key authentication for the webhook subscription
 * @property        {WebhookAuthenticationBasicItem} authenticationBasic Basic authentication for the webhook subscription
 * @property        {Collection<WebhookDeliveryItem>} deliveries  Webhook deliveries belonging to this subscription
 * @property        {Date}                  createdAt           Date and time when the subscription was created
 * @property        {Date}                  updatedAt           Date and time when the subscription was last updated
 */
@Entity()
export class WebhookSubscriptionItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the webhook subscription (primary key).
   * @type {number}
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Description of the webhook subscription.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * URL of the webhook subscription.
   * @type {string}
   */
  @ApiProperty()
  @Property({ length: 256, nullable: false })
  url!: string;

  /**
   * Optional custom headers for the webhook subscription (nullable).
   * @type {object}
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  customHeaders?: object;

  /**
   * Indicates whether the webhook subscription is active.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  /**
   * Signing secret for the webhook subscription.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 128, nullable: true })
  signingSecret?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Entity associated with this webhook subscription.
   * @type {EntityItem}
   */
  @ApiPropertyOptional({
    type: () => EntityItem,
  })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem, {
    nullable: false,
  })
  entity!: EntityItem;

  /**
   * Type of the webhook subscription.
   * @type {WebhookSubscriptionTypeItem}
   */
  @ApiPropertyOptional({
    type: () => WebhookSubscriptionTypeItem,
    default: 'afterInsert',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookSubscriptionTypeItem, {
    defaultRaw: `'afterInsert'`,
    nullable: false,
  })
  type!: WebhookSubscriptionTypeItem;

  /**
   * Type of the webhook subscription payload.
   * @type {WebhookSubscriptionPayloadType}
   */
  @ApiPropertyOptional({
    type: () => WebhookSubscriptionPayloadType,
    default: 'list',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookSubscriptionPayloadType, {
    defaultRaw: `'list'`,
    nullable: false,
  })
  payloadType!: WebhookSubscriptionPayloadType;

  /**
   * Method of the webhook subscription.
   * @type {WebhookSubscriptionMethodItem}
   */
  @ApiPropertyOptional({
    type: () => WebhookSubscriptionMethodItem,
    default: 'post',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookSubscriptionMethodItem, {
    defaultRaw: `'post'`,
    nullable: false,
  })
  method!: WebhookSubscriptionMethodItem;

  /**
   * Authentication type of the webhook subscription.
   * @type {WebhookAuthenticationTypeItem}
   */
  @ApiPropertyOptional({
    type: () => WebhookAuthenticationTypeItem,
    default: 'none',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookAuthenticationTypeItem, {
    defaultRaw: `'none'`,
    nullable: true,
  })
  authenticationType!: WebhookAuthenticationTypeItem;

  /**
   * OAuth2 authentication for the webhook subscription.
   * @type {WebhookAuthenticationOAuth2Item}
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationOAuth2Item })
  @ManyToOne(() => WebhookAuthenticationOAuth2Item, { nullable: true })
  authenticationOAuth2!: WebhookAuthenticationOAuth2Item;

  /**
   * API key authentication for the webhook subscription.
   * @type {WebhookAuthenticationApiKeyItem}
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationApiKeyItem })
  @ManyToOne(() => WebhookAuthenticationApiKeyItem, { nullable: true })
  authenticationApiKey!: WebhookAuthenticationApiKeyItem;

  /**
   * Basic authentication for the webhook subscription.
   * @type {WebhookAuthenticationBasicItem}
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationBasicItem })
  @ManyToOne(() => WebhookAuthenticationBasicItem, { nullable: true })
  authenticationBasic!: WebhookAuthenticationBasicItem;

  /**
   * Webhook deliveries belonging to this subscription.
   * @type {Collection<WebhookDeliveryItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookDeliveryItem, isArray: true })
  @OneToMany(() => WebhookDeliveryItem, (x) => x.subscription)
  deliveries: Collection<WebhookDeliveryItem> = new Collection<WebhookDeliveryItem>(this);
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
