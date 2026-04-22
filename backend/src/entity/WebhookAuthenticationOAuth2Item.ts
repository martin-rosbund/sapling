import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing OAuth2 authentication details for webhooks, including persisted properties, relations, and system fields.
 *
 * @property        {number}        handle        Unique identifier for the OAuth2 item (primary key)
 * @property        {string}        description   Description of the OAuth2 item
 * @property        {string}        clientId      Client ID for OAuth2 authentication
 * @property        {string}        clientSecret  Client secret for OAuth2 authentication (optional)
 * @property        {string}        tokenUrl      Token URL for obtaining OAuth2 tokens (optional)
 * @property        {string}        scope         Scope for OAuth2 authentication (optional)
 * @property        {string}        cachedToken   Cached OAuth2 token (optional)
 * @property        {Date}          tokenExpiresAt Token expiration date and time (optional)
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions Webhook subscriptions belonging to this authentication type
 * @property        {Date}          createdAt     Date and time when the OAuth2 item was created
 * @property        {Date}          updatedAt     Date and time when the OAuth2 item was last updated
 */
@Entity()
export class WebhookAuthenticationOAuth2Item {
  //#region Properties: Persisted
  /**
   * Unique identifier for the OAuth2 item (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;
  /**
   * Description of the OAuth2 item.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'webhookAuthenticationOAuth2.groupContent',
    width: 4,
  })
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Client ID for OAuth2 authentication.
   * @type {string}
   */
  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'webhookAuthenticationOAuth2.groupBasics',
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  clientId!: string;

  /**
   * Client secret for OAuth2 authentication (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 100,
    group: 'webhookAuthenticationOAuth2.groupSecurity',
    width: 4,
  })
  @Property({ nullable: true, length: 256 })
  clientSecret?: string;

  /**
   * Token URL for obtaining OAuth2 tokens (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'webhookAuthenticationOAuth2.groupSecurity',
    width: 4,
  })
  @Property({ nullable: false, length: 256 })
  tokenUrl!: string;

  /**
   * Scope for OAuth2 authentication (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'webhookAuthenticationOAuth2.groupBasics',
    width: 4,
  })
  @Property({ nullable: true, length: 256 })
  scope?: string;

  /**
   * Cached OAuth2 token (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'webhookAuthenticationOAuth2.groupSecurity',
    width: 4,
  })
  @Property({ nullable: true, length: 256 })
  cachedToken?: string;

  /**
   * Token expiration date and time (optional).
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 400,
    group: 'webhookAuthenticationOAuth2.groupSecurity',
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  tokenExpiresAt?: Date;
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this authentication type.
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.authenticationOAuth2)
  subscriptions: Collection<WebhookSubscriptionItem> =
    new Collection<WebhookSubscriptionItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the OAuth2 item was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the OAuth2 item was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
