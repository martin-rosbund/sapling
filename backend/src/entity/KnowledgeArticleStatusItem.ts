import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { KnowledgeArticleItem } from './KnowledgeArticleItem';

@Entity()
export class KnowledgeArticleStatusItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleStatus.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 64, nullable: false })
  description!: string;

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ length: 32, nullable: false })
  color!: string;

  @ApiPropertyOptional({ default: 'mdi-file-document-outline' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticleStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({
    default: 'mdi-file-document-outline',
    length: 64,
    nullable: false,
  })
  icon?: string = 'mdi-file-document-outline';

  @ApiPropertyOptional({ default: 100 })
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 300,
    group: 'knowledgeArticleStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 100, nullable: false })
  sortOrder = 100;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'knowledgeArticleStatus.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  isPublished = false;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 200,
    group: 'knowledgeArticleStatus.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  isArchived = false;

  @ApiPropertyOptional({ type: () => KnowledgeArticleItem, isArray: true })
  @OneToMany(() => KnowledgeArticleItem, (article) => article.status)
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
