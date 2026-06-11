import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentItem } from './AiAgentItem';
import { AiAgentEvaluationItem } from './AiAgentEvaluationItem';
import { AiAgentRunItem } from './AiAgentRunItem';
import { AiChatSessionItem } from './AiChatSessionItem';
import { AiProviderModelItem } from './AiProviderModelItem';
import { AiProviderTypeItem } from './AiProviderTypeItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';

@Entity()
export class AiAgentVersionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentVersion.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @ManyToOne(() => AiAgentItem, { nullable: false })
  agent!: Rel<AiAgentItem>;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderDESC'])
  @SaplingForm({
    order: 200,
    group: 'aiAgentVersion.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ nullable: false })
  version = 1;

  @ApiPropertyOptional({ default: 'draft' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'aiAgentVersion.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: true,
  })
  @Property({ length: 16, nullable: false, default: 'draft' })
  status = 'draft';

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentVersion.groupPrompt',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: false })
  promptMarkdown!: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'aiAgentVersion.groupPrompt',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  changelog?: string | null;

  @ApiPropertyOptional({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentVersion.groupRuntime',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderTypeItem, { nullable: true })
  provider?: Rel<AiProviderTypeItem> | null;

  @ApiPropertyOptional({ type: () => AiProviderModelItem })
  @Sapling(['isChip'])
  @SaplingDependsOn({
    parentField: 'provider',
    targetField: 'provider',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 200,
    group: 'aiAgentVersion.groupRuntime',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderModelItem, { nullable: true })
  model?: Rel<AiProviderModelItem> | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  allowedEntityHandles?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  allowedKnowledgeEntityHandles?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  allowedInternalTools?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  allowedExternalTools?: string[] | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  activatedAt?: Date | null;

  @OneToMany(() => AiChatSessionItem, (session) => session.agentVersion)
  sessions: Collection<AiChatSessionItem> = new Collection<AiChatSessionItem>(
    this,
  );

  @OneToMany(() => AiAgentRunItem, (run) => run.agentVersion)
  runs: Collection<AiAgentRunItem> = new Collection<AiAgentRunItem>(this);

  @OneToMany(
    () => AiAgentEvaluationItem,
    (evaluation) => evaluation.agentVersion,
  )
  evaluations: Collection<AiAgentEvaluationItem> =
    new Collection<AiAgentEvaluationItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
