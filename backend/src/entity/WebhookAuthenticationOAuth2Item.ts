import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * Entity representing OAuth2 authentication details for webhooks.
 * Contains OAuth2 specific properties.
 */
@Entity()
export class WebhookAuthenticationOAuth2Item {
  //#region Properties: Persisted
  /**
   * Unique identifier for the OAuth2 item (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;
  /**
   * Description of the OAuth2 item.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Client ID for OAuth2 authentication.
   */
  @ApiProperty()
  @Property({ length: 128, nullable: false })
  clientId!: string;

  /**
   * Client secret for OAuth2 authentication (optional).
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ nullable: false, length: 256 })
  clientSecret: string;

  /**
   * Token URL for obtaining OAuth2 tokens (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: false, length: 256 })
  tokenUrl: string;

  /**
   * Scope for OAuth2 authentication (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 256 })
  scope?: string;

  /**
   * Token URL for obtaining OAuth2 tokens (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 256 })
  cachedToken?: string;

  /**
   * Token expiration date and time (optional).
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  tokenExpiresAt?: Date | null;
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this authentication type.
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.authenticationOAuth2)
  subscriptions = new Collection<WebhookSubscriptionItem>(this);
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
