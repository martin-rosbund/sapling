import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentItem } from './AiAgentItem';
import { AiAgentRunItem } from './AiAgentRunItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiAgentPlaybookItem {
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentItem, { nullable: false })
  agent!: Rel<AiAgentItem>;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentPlaybook.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 160, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiAgentPlaybook.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  triggerEntityHandles?: string[] | null;

  @ApiProperty({ type: [String] })
  @Sapling(['isMarkdown'])
  @Property({ type: 'json', nullable: false })
  steps: string[] = [];

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @Property({ type: 'text', nullable: true })
  expectedOutput?: string | null;

  @ApiPropertyOptional({ default: true })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional({ default: 100 })
  @Property({ nullable: false, default: 100 })
  sortOrder = 100;

  @OneToMany(() => AiAgentRunItem, (run) => run.playbook)
  runs: Collection<AiAgentRunItem> = new Collection<AiAgentRunItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
