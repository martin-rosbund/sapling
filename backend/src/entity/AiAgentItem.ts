import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiChatSessionItem } from './AiChatSessionItem';
import { AiChatToolActionItem } from './AiChatToolActionItem';
import { AiProviderModelItem } from './AiProviderModelItem';
import { AiProviderTypeItem } from './AiProviderTypeItem';
import { RoleItem } from './RoleItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';

@Entity()
export class AiAgentItem {
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'aiAgent.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'aiAgent.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiAgent.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  description?: string | null;

  @ApiPropertyOptional()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 400,
    group: 'aiAgent.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ length: 64, nullable: true })
  icon?: string | null;

  @ApiPropertyOptional()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 500,
    group: 'aiAgent.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: true })
  color?: string | null;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'aiAgent.groupPrompt',
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
    group: 'aiAgent.groupPrompt',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  welcomeMessage?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 300,
    group: 'aiAgent.groupPrompt',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  conversationStarters?: string[] | null;

  @ApiPropertyOptional({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiAgent.groupRuntime',
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
    group: 'aiAgent.groupRuntime',
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
  @SaplingForm({
    order: 100,
    group: 'aiAgent.groupScope',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  allowedEntityHandles?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 200,
    group: 'aiAgent.groupScope',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  allowedKnowledgeEntityHandles?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 300,
    group: 'aiAgent.groupScope',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  allowedInternalTools?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 400,
    group: 'aiAgent.groupScope',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  allowedExternalTools?: string[] | null;

  @ApiPropertyOptional({ default: 'confirm' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiAgent.groupGovernance',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 16, nullable: false, default: 'confirm' })
  mutationMode = 'confirm';

  @ApiPropertyOptional({ type: () => RoleItem, isArray: true })
  @SaplingForm({
    order: 200,
    group: 'aiAgent.groupGovernance',
    groupOrder: 500,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToMany(() => RoleItem, undefined, { owner: true })
  roles: Collection<RoleItem> = new Collection<RoleItem>(this);

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'aiAgent.groupConfiguration',
    groupOrder: 600,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 200,
    group: 'aiAgent.groupConfiguration',
    groupOrder: 600,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  isDefault = false;

  @ApiPropertyOptional({ default: 100 })
  @SaplingForm({
    order: 300,
    group: 'aiAgent.groupConfiguration',
    groupOrder: 600,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 100 })
  sortOrder = 100;

  @ApiPropertyOptional({ type: () => AiChatSessionItem, isArray: true })
  @OneToMany(() => AiChatSessionItem, (session) => session.agent)
  sessions: Collection<AiChatSessionItem> = new Collection<AiChatSessionItem>(
    this,
  );

  @ApiPropertyOptional({ type: () => AiChatToolActionItem, isArray: true })
  @OneToMany(() => AiChatToolActionItem, (action) => action.agent)
  toolActions: Collection<AiChatToolActionItem> =
    new Collection<AiChatToolActionItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
