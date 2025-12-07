import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionTypeItem } from './WebhookSubscriptionTypeItem';
import { WebhookAuthenticationTypeItem } from './WebhookAuthenticationTypeItem';
import { WebhookAuthenticationOAuth2Item } from './WebhookAuthenticationOAuth2Item';
import { WebhookAuthenticationApiKeyItem } from './WebhookAuthenticationApiKeyItem';
import { WebhookDeliveryItem } from './WebhookDeliveryItem';

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
  handle!: number | null;

  /**
   * Description of the webhook subscription.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
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
  isActive!: boolean | null;

  /**
   * Signing secret for the webhook subscription.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 128, nullable: false })
  signingSecret!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Type of the webhook subscription.
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionTypeItem, default: 'execute' })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookSubscriptionTypeItem, { defaultRaw: `'execute'`, nullable: false })
  type!: WebhookSubscriptionTypeItem;

  /**
   * Authentication type of the webhook subscription.
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationTypeItem, default: 'none' })
  @Sapling(['isChip'])
  @ManyToOne(() => WebhookAuthenticationTypeItem, { defaultRaw: `'none'`, nullable: true })
  authenticationType!: WebhookAuthenticationTypeItem | null;

  /**
   * Authentication type of the webhook subscription.
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationOAuth2Item })
  @ManyToOne(() => WebhookAuthenticationOAuth2Item, { nullable: true })
  authenticationOAuth2!: WebhookAuthenticationOAuth2Item | null;

  /**
   * Authentication type of the webhook subscription.
   */
  @ApiPropertyOptional({ type: () => WebhookAuthenticationApiKeyItem })
  @ManyToOne(() => WebhookAuthenticationApiKeyItem, { nullable: true })
  authenticationApiKey!: WebhookAuthenticationApiKeyItem | null;

  /**
   * Webhook subscriptions belonging to this subscription type.
   */
  @ApiPropertyOptional({ type: () => WebhookDeliveryItem, isArray: true })
  @OneToMany(() => WebhookDeliveryItem, (x) => x.subscription)
  deliveries = new Collection<WebhookDeliveryItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the note was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the note was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
