import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EffortEstimateItem } from './EffortEstimateItem';
import { KnowledgeArticleCategoryItem } from './KnowledgeArticleCategoryItem';
import { KnowledgeArticleStatusItem } from './KnowledgeArticleStatusItem';
import { KnowledgeArticleVisibilityItem } from './KnowledgeArticleVisibilityItem';
import { PersonItem } from './PersonItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { TicketItem } from './TicketItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class KnowledgeArticleItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticle.groupBasics',
    groupOrder: 100,
    width: 3,
  })
  @Property({ length: 160, nullable: false })
  title!: string;

  @ApiProperty({ type: () => KnowledgeArticleStatusItem, default: 'draft' })
  @Sapling(['isChip', 'isValue'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticle.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => KnowledgeArticleStatusItem, {
    default: 'draft',
    nullable: false,
  })
  status!: Rel<KnowledgeArticleStatusItem>;

  @ApiPropertyOptional({
    type: () => KnowledgeArticleVisibilityItem,
    default: 'internal',
  })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'knowledgeArticle.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => KnowledgeArticleVisibilityItem, {
    default: 'internal',
    nullable: false,
  })
  visibility!: Rel<KnowledgeArticleVisibilityItem>;

  @ApiPropertyOptional({ type: () => KnowledgeArticleCategoryItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 400,
    group: 'knowledgeArticle.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => KnowledgeArticleCategoryItem, { nullable: true })
  category?: Rel<KnowledgeArticleCategoryItem>;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'knowledgeArticle.groupBasics',
    groupOrder: 100,
    width: 4,
  })
  @Property({ nullable: true, type: 'text' })
  summary?: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 600,
    group: 'knowledgeArticle.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 512, nullable: true })
  tags?: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticle.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, type: 'text' })
  problemMarkdown?: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticle.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, type: 'text' })
  solutionMarkdown?: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticle.groupLifecycle',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDateStart'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticle.groupLifecycle',
    groupOrder: 300,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  publishedAt?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date' })
  @Sapling(['isDeadline'])
  @SaplingForm({
    order: 300,
    group: 'knowledgeArticle.groupLifecycle',
    groupOrder: 300,
    width: 1,
  })
  @Property({ nullable: true, type: 'date' })
  validUntil?: Date;

  @ApiPropertyOptional({ type: () => TicketItem })
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticle.groupSource',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => TicketItem, { nullable: true })
  sourceTicket?: Rel<TicketItem>;

  @ApiPropertyOptional({ type: () => SalesOpportunityItem })
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticle.groupSource',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => SalesOpportunityItem, { nullable: true })
  sourceSalesOpportunity?: Rel<SalesOpportunityItem>;

  @ApiPropertyOptional({ type: () => EffortEstimateItem })
  @SaplingForm({
    order: 300,
    group: 'knowledgeArticle.groupSource',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => EffortEstimateItem, { nullable: true })
  sourceEffortEstimate?: Rel<EffortEstimateItem>;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticle.groupPeople',
    groupOrder: 500,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  authorPerson?: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticle.groupPeople',
    groupOrder: 500,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  reviewerPerson?: Rel<PersonItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
