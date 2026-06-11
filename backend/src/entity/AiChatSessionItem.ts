import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { AiAgentItem } from './AiAgentItem';
import { AiAgentPlaybookItem } from './AiAgentPlaybookItem';
import { AiAgentVersionItem } from './AiAgentVersionItem';
import { AiProviderModelItem } from './AiProviderModelItem';
import { AiProviderTypeItem } from './AiProviderTypeItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { AiChatMessageItem } from './AiChatMessageItem';

@Entity()
export class AiChatSessionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'aiChatSession.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 256, nullable: false })
  title!: string;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 200,
    group: 'aiChatSession.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isArchived = false;

  @ApiPropertyOptional({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatSession.groupReference',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderTypeItem, { nullable: true })
  provider?: Rel<AiProviderTypeItem> | null;

  @ApiPropertyOptional({ type: () => AiProviderModelItem })
  @SaplingDependsOn({
    parentField: 'provider',
    targetField: 'provider',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 200,
    group: 'aiChatSession.groupReference',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderModelItem, { nullable: true })
  model?: Rel<AiProviderModelItem> | null;

  @ApiPropertyOptional({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'aiChatSession.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => AiAgentItem, { nullable: true })
  agent?: Rel<AiAgentItem> | null;

  @ApiPropertyOptional({ type: () => AiAgentVersionItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 325,
    group: 'aiChatSession.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 325,
    tableVisible: false,
    mobileOrder: 325,
    mobileVisible: false,
  })
  @ManyToOne(() => AiAgentVersionItem, { nullable: true })
  agentVersion?: Rel<AiAgentVersionItem> | null;

  @ApiPropertyOptional({ type: () => AiAgentPlaybookItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 350,
    group: 'aiChatSession.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 350,
    tableVisible: false,
    mobileOrder: 350,
    mobileVisible: false,
  })
  @ManyToOne(() => AiAgentPlaybookItem, { nullable: true })
  playbook?: Rel<AiAgentPlaybookItem> | null;

  @ApiPropertyOptional()
  @Property({ length: 64, nullable: true })
  contextEntityHandle?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  contextRecordHandle?: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: true, type: 'datetime' })
  lastMessageAt?: Date | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @SaplingForm({
    order: 400,
    group: 'aiChatSession.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => AiChatMessageItem, isArray: true })
  @OneToMany(() => AiChatMessageItem, (message) => message.session)
  messages: Collection<AiChatMessageItem> = new Collection<AiChatMessageItem>(
    this,
  );

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
