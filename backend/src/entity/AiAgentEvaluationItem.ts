import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentItem } from './AiAgentItem';
import { AiAgentVersionItem } from './AiAgentVersionItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiAgentEvaluationItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentItem, { nullable: false })
  agent!: Rel<AiAgentItem>;

  @ApiPropertyOptional({ type: () => AiAgentVersionItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentVersionItem, { nullable: true })
  agentVersion?: Rel<AiAgentVersionItem> | null;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentEvaluation.groupBasics',
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

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'aiAgentEvaluation.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: false })
  prompt!: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @Property({ type: 'text', nullable: true })
  expectedCriteria?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 64, nullable: true })
  targetEntityHandle?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  targetRecordHandle?: string | null;

  @ApiPropertyOptional({ default: 'needsReview' })
  @Sapling(['isChip'])
  @Property({ length: 32, nullable: false, default: 'needsReview' })
  status = 'needsReview';

  @ApiPropertyOptional()
  @Property({ nullable: true })
  rating?: number | null;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @Property({ type: 'text', nullable: true })
  comment?: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
