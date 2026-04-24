import { Entity, Property, Unique } from '@mikro-orm/decorators/legacy';
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

@Entity()
@Unique({
  properties: [
    'sourceEntityHandle',
    'sourceRecordHandle',
    'sourceSection',
    'chunkIndex',
  ],
})
export class AiVectorDocumentItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Property({ length: 64, nullable: false })
  sourceEntityHandle!: string;

  @ApiProperty()
  @Property({ length: 128, nullable: false })
  sourceRecordHandle!: string;

  @ApiProperty()
  @Property({ length: 64, nullable: false })
  sourceSection!: string;

  @ApiProperty()
  @Property({ nullable: false, default: 0 })
  chunkIndex = 0;

  @ApiPropertyOptional()
  @Property({ length: 256, nullable: true })
  title?: string | null;

  @ApiProperty()
  @Property({ columnType: 'text', nullable: false })
  content!: string;

  @ApiProperty()
  @Property({ length: 64, nullable: false })
  contentHash!: string;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  @Property({ length: 64, nullable: false })
  providerHandle!: string;

  @ApiProperty()
  @Property({ length: 128, nullable: false })
  modelHandle!: string;

  @ApiProperty()
  @Property({ nullable: false })
  embeddingDimensions!: number;

  @ApiHideProperty()
  @Property({ hidden: true, columnType: 'vector', nullable: false })
  embedding!: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
