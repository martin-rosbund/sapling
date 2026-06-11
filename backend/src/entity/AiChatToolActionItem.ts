import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentItem } from './AiAgentItem';
import { AiChatMessageItem } from './AiChatMessageItem';
import { AiChatSessionItem } from './AiChatSessionItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiChatToolActionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => AiChatSessionItem })
  @SaplingForm({
    order: 100,
    group: 'aiChatToolAction.groupReference',
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

  @ApiPropertyOptional({ type: () => AiChatMessageItem })
  @SaplingForm({
    order: 200,
    group: 'aiChatToolAction.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => AiChatMessageItem, { nullable: true })
  message?: Rel<AiChatMessageItem> | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @SaplingForm({
    order: 300,
    group: 'aiChatToolAction.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 400,
    group: 'aiChatToolAction.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => AiAgentItem, { nullable: true })
  agent?: Rel<AiAgentItem> | null;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatToolAction.groupTool',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  serverName!: string;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'aiChatToolAction.groupTool',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  toolName!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatToolAction.groupTool',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  arguments?: Record<string, unknown> | null;

  @ApiPropertyOptional({ default: 'pending' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatToolAction.groupStatus',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false, default: 'pending' })
  status = 'pending';

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiChatToolAction.groupStatus',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  resultPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatToolAction.groupStatus',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  errorPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 400,
    group: 'aiChatToolAction.groupStatus',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 500,
    group: 'aiChatToolAction.groupStatus',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  executedAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
