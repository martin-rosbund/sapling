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
  @SaplingForm({
    order: 100,
    group: 'aiChatMessage.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => AiChatSessionItem, { nullable: false })
  session!: Rel<AiChatSessionItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @SaplingForm({
    order: 200,
    group: 'aiChatMessage.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatMessage.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false })
  role!: string;

  @ApiPropertyOptional({ default: 'completed' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'aiChatMessage.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false, default: 'completed' })
  status = 'completed';

  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'aiChatMessage.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: false })
  sequence!: number;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'aiChatMessage.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 16384, nullable: false })
  content!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiChatMessage.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  contextPayload?: object | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'aiChatMessage.groupBasics',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  toolCalls?: object[] | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatMessage.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  requestPayload?: object | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'aiChatMessage.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  responsePayload?: object | null;

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatMessage.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 64, nullable: true })
  provider?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiChatMessage.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: true })
  model?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatMessage.groupIntegration',
    groupOrder: 400,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ length: 512, nullable: true })
  url?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'aiChatMessage.groupBasics',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: false,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: true })
  routeName?: string | null;

  @ApiPropertyOptional()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 600,
    group: 'aiChatMessage.groupBasics',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: true,
  })
  @Property({ length: 256, nullable: true })
  pageTitle?: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
