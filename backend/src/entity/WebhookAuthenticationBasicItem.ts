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
 * Entity representing Basic Authentication details for webhooks.
 * Contains Basic Authentication specific properties.
 */
@Entity()
export class WebhookAuthenticationBasicItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the Basic Authentication item (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;
  /*
   * Description of the Basic Authentication item.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Username for Basic Authentication.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  username!: string;

  /**
   * Password for Basic Authentication.
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ nullable: true, length: 64 })
  password?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Webhook subscriptions belonging to this authentication type.
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.authenticationBasic)
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
