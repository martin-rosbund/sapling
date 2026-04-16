import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing Basic Authentication details for webhooks, including persisted properties, relations, and system fields.
 *
 * @property        {number}        handle        Unique identifier for the Basic Authentication item (primary key)
 * @property        {string}        description   Description of the Basic Authentication item
 * @property        {string}        username      Username for Basic Authentication
 * @property        {string}        password      Password for Basic Authentication (optional)
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions Webhook subscriptions belonging to this authentication type
 * @property        {Date}          createdAt     Date and time when the Basic Authentication item was created
 * @property        {Date}          updatedAt     Date and time when the Basic Authentication item was last updated
 */
@Entity()
export class WebhookAuthenticationBasicItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the Basic Authentication item (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;
  /**
   * Description of the Basic Authentication item.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Username for Basic Authentication.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  username!: string;

  /**
   * Password for Basic Authentication (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ nullable: true, length: 64 })
  password?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this authentication type.
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.authenticationBasic)
  subscriptions: Collection<WebhookSubscriptionItem> =
    new Collection<WebhookSubscriptionItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the Basic Authentication item was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the Basic Authentication item was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
