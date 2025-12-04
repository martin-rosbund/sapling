import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a webhook delivery.
 * Contains delivery details.
 */
@Entity()
export class WebhookDeliveryItem {
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
   * Payload of the webhook delivery.
   */
  @ApiProperty()
  @Property({ type: 'json', nullable: false })
  payload!: string;

  /**
   * Response status code of the webhook delivery.
   */
  @ApiProperty()
  @Property({ default: 200, nullable: false })
  responseStatusCode!: number | null;

  /**
   * Response body of the webhook delivery.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ type: 'json', nullable: true })
  responseBody!: string;

  /**
   * Number of delivery attempts made.
   */
  @ApiProperty()
  @Property({ default: 0, nullable: false })
  attemptCount!: number | null;
  //#endregion

  //#region Properties: Relation
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
