import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { KnowledgeArticleItem } from './KnowledgeArticleItem';

@Entity()
export class KnowledgeArticleCategoryItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleCategory.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticleCategory.groupBasics',
    groupOrder: 100,
    width: 3,
  })
  @Property({ length: 256, nullable: true })
  description?: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleCategory.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({
    default: 'mdi-shape-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-shape-outline';

  @ApiPropertyOptional({ default: '#607D8B' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticleCategory.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#607D8B', length: 32, nullable: false })
  color: string = '#607D8B';

  @ApiPropertyOptional({ default: 100 })
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 300,
    group: 'knowledgeArticleCategory.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 100, nullable: false })
  sortOrder = 100;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleCategory.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ type: () => KnowledgeArticleItem, isArray: true })
  @OneToMany(() => KnowledgeArticleItem, (article) => article.category)
  articles: Collection<KnowledgeArticleItem> =
    new Collection<KnowledgeArticleItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
