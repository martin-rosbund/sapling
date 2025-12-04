import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing API Key authentication details for webhooks.
 * Contains API Key specific properties.
 */
@Entity()
export class WebhookAuthenticationApiKeyItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the API Key item (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;
  /*
   * Description of the API Key item.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Header name for the API Key authentication.
   */
  @ApiProperty()
  @Property({ length: 128, nullable: false })
  headerName!: string;

  /**
   * API Key value (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 256 })
  apiKey?: string;
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
