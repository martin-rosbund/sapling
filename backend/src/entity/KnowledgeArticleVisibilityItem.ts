import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { KnowledgeArticleItem } from './KnowledgeArticleItem';

@Entity()
export class KnowledgeArticleVisibilityItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleVisibility.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 64, nullable: false })
  description!: string;

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleVisibility.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false })
  color!: string;

  @ApiPropertyOptional({ default: 'mdi-eye-outline' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticleVisibility.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-eye-outline', length: 64, nullable: false })
  icon?: string = 'mdi-eye-outline';

  @ApiPropertyOptional({ default: 100 })
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 300,
    group: 'knowledgeArticleVisibility.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: 100, nullable: false })
  sortOrder = 100;

  @ApiPropertyOptional({ type: () => KnowledgeArticleItem, isArray: true })
  @OneToMany(() => KnowledgeArticleItem, (article) => article.visibility)
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
