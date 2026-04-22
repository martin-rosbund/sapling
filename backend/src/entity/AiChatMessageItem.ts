import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiChatSessionItem } from './AiChatSessionItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiChatMessageItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => AiChatSessionItem })
  @SaplingForm({ order: 100, group: 'aiChatMessage.groupReference', width: 2 })
  @ManyToOne(() => AiChatSessionItem, { nullable: false })
  session!: Rel<AiChatSessionItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @SaplingForm({ order: 200, group: 'aiChatMessage.groupReference', width: 2 })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({ order: 100, group: 'aiChatMessage.groupBasics', width: 1 })
  @Property({ length: 32, nullable: false })
  role!: string;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({ order: 200, group: 'aiChatMessage.groupBasics', width: 1 })
  @Property({ length: 32, nullable: false, default: 'completed' })
  status = 'completed';

  @ApiProperty()
  @SaplingForm({ order: 300, group: 'aiChatMessage.groupBasics', width: 1 })
  @Property({ nullable: false })
  sequence!: number;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({ order: 100, group: 'aiChatMessage.groupContent', width: 4 })
  @Property({ length: 16384, nullable: false })
  content!: string;

  @ApiPropertyOptional()
  @SaplingForm({ order: 200, group: 'aiChatMessage.groupContent', width: 4 })
  @Property({ type: 'json', nullable: true })
  contextPayload?: object | null;

  @ApiPropertyOptional()
  @SaplingForm({ order: 400, group: 'aiChatMessage.groupBasics', width: 2 })
  @Property({ type: 'json', nullable: true })
  toolCalls?: object[] | null;

  @ApiPropertyOptional()
  @SaplingForm({ order: 300, group: 'aiChatMessage.groupContent', width: 4 })
  @Property({ type: 'json', nullable: true })
  requestPayload?: object | null;

  @ApiPropertyOptional()
  @SaplingForm({ order: 400, group: 'aiChatMessage.groupContent', width: 4 })
  @Property({ type: 'json', nullable: true })
  responsePayload?: object | null;

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatMessage.groupIntegration',
    width: 2,
  })
  @Property({ length: 64, nullable: true })
  provider?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiChatMessage.groupIntegration',
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  model?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatMessage.groupIntegration',
    width: 4,
  })
  @Property({ length: 512, nullable: true })
  url?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({ order: 500, group: 'aiChatMessage.groupBasics', width: 2 })
  @Property({ length: 128, nullable: true })
  routeName?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({ order: 600, group: 'aiChatMessage.groupBasics', width: 4 })
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
