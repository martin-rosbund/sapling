import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Defines the delivery statuses available for webhooks.
 * Each status includes properties for display and organization.
 */
@Entity()
export class WebhookDeliveryStatusItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the webhook delivery status.
   */
  @ApiProperty()
  @PrimaryKey()
  handle: string;

  /**
   * Name of the webhook delivery status.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  description!: string | null;

  /**
   * Icon representing the webhook delivery status.
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon!: string | null;

  /**
   * Color associated with the webhook delivery status.
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  //#endregion

  //#region Properties: Relation
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the webhook delivery status was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the webhook delivery status was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
