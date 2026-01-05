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

/**
 * Entity representing a webhook subscription.
 * Contains subscription details.
 */
@Entity()
export class WebhookSubscriptionItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the webhook subscription (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Description of the webhook subscription.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * URL of the webhook subscription.
   */
  @ApiProperty()
  @Property({ length: 256, nullable: false })
  url!: string;

  /**
   * Optional query parameter (nullable).
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  customHeaders?: object;

  /**
   * Indicates whether the webhook subscription is active.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  /**
   * Signing secret for the webhook subscription.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 128, nullable: true })
  signingSecret?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Entity associated with this webhook subscription.
   */
  @ApiPropertyOptional({
    type: () => EntityItem,
  })
  @ManyToOne(() => EntityItem, {
    nullable: false,
  })
  entity!: EntityItem;
  /**
   * Type of the webhook subscription.
   */
  @ApiPropertyOptional({
    type: () => WebhookSubscriptionTypeItem,
    default: 'execute',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookSubscriptionTypeItem, {
    defaultRaw: `'afterInsert'`,
    nullable: false,
  })
  type!: WebhookSubscriptionTypeItem;

  /**
   * Type of the webhook subscription.
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
   * Authentication type of the webhook subscription.
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationOAuth2Item })
  @ManyToOne(() => WebhookAuthenticationOAuth2Item, { nullable: true })
  authenticationOAuth2!: WebhookAuthenticationOAuth2Item;

  /**
   * Authentication type of the webhook subscription.
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationApiKeyItem })
  @ManyToOne(() => WebhookAuthenticationApiKeyItem, { nullable: true })
  authenticationApiKey!: WebhookAuthenticationApiKeyItem;

  /**
   * Webhook subscriptions belonging to this subscription type.
   */
  @ApiPropertyOptional({ type: () => WebhookDeliveryItem, isArray: true })
  @OneToMany(() => WebhookDeliveryItem, (x) => x.subscription)
  deliveries = new Collection<WebhookDeliveryItem>(this);
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
