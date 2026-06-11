import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentItem } from './AiAgentItem';
import { AiAgentPlaybookItem } from './AiAgentPlaybookItem';
import { AiAgentVersionItem } from './AiAgentVersionItem';
import { AiChatMessageItem } from './AiChatMessageItem';
import { AiChatSessionItem } from './AiChatSessionItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiAgentRunItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional({ type: () => AiChatSessionItem })
  @ManyToOne(() => AiChatSessionItem, { nullable: true })
  session?: Rel<AiChatSessionItem> | null;

  @ApiPropertyOptional({ type: () => AiChatMessageItem })
  @ManyToOne(() => AiChatMessageItem, { nullable: true })
  message?: Rel<AiChatMessageItem> | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentItem, { nullable: true })
  agent?: Rel<AiAgentItem> | null;

  @ApiPropertyOptional({ type: () => AiAgentVersionItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentVersionItem, { nullable: true })
  agentVersion?: Rel<AiAgentVersionItem> | null;

  @ApiPropertyOptional({ type: () => AiAgentPlaybookItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentPlaybookItem, { nullable: true })
  playbook?: Rel<AiAgentPlaybookItem> | null;

  @ApiPropertyOptional({ default: 'running' })
  @Sapling(['isValue', 'isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentRun.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 32, nullable: false, default: 'running' })
  status = 'running';

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiAgentRun.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 64, nullable: true })
  provider?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiAgentRun.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: true })
  model?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 64, nullable: true })
  contextEntityHandle?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  contextRecordHandle?: string | null;

  @ApiPropertyOptional()
  @Property({ nullable: true })
  durationMs?: number | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  toolCalls?: Record<string, unknown>[] | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  sources?: Record<string, unknown>[] | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  pendingActions?: Record<string, unknown>[] | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  usagePayload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @Property({ type: 'text', nullable: true })
  responseText?: string | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  errorPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  startedAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
