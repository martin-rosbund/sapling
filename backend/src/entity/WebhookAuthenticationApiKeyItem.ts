import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing API Key authentication details for webhooks, including persisted properties, relations, and system fields.
 *
 * @property        {number}        handle        Unique identifier for the API Key item (primary key)
 * @property        {string}        description   Description of the API Key item
 * @property        {string}        headerName    Header name for the API Key authentication
 * @property        {string}        apiKey        API Key value (optional)
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions Webhook subscriptions belonging to this authentication type
 * @property        {Date}          createdAt     Date and time when the API Key item was created
 * @property        {Date}          updatedAt     Date and time when the API Key item was last updated
 */
@Entity()
export class WebhookAuthenticationApiKeyItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the API Key item (primary key).
   * @type {number}
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;
  /**
   * Description of the API Key item.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Header name for the API Key authentication.
   * @type {string}
   */
  @ApiProperty()
  @Property({ length: 128, nullable: false })
  headerName!: string;

  /**
   * API Key value (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ nullable: true, length: 256 })
  apiKey?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this authentication type.
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.authenticationApiKey)
  subscriptions: Collection<WebhookSubscriptionItem> = new Collection<WebhookSubscriptionItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the API Key item was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the API Key item was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
