import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiChatSessionItem } from './AiChatSessionItem';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class AiChatMessageItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => AiChatSessionItem })
  @ManyToOne(() => AiChatSessionItem, { nullable: false })
  session!: Rel<AiChatSessionItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty()
  @Sapling(['isChip'])
  @Property({ length: 32, nullable: false })
  role!: string;

  @ApiProperty()
  @Sapling(['isChip'])
  @Property({ length: 32, nullable: false, default: 'completed' })
  status = 'completed';

  @ApiProperty()
  @Property({ nullable: false })
  sequence!: number;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @Property({ length: 16384, nullable: false })
  content!: string;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  contextPayload?: object | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  toolCalls?: object[] | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  requestPayload?: object | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  responsePayload?: object | null;

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @Property({ length: 64, nullable: true })
  provider?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  model?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 512, nullable: true })
  url?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  routeName?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 256, nullable: true })
  pageTitle?: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}