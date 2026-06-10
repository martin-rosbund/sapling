import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ImportBatchItem } from './ImportBatchItem';
import { ExternalRecordLinkItem } from './ExternalRecordLinkItem';
import { ImportTemplateItem } from './ImportTemplateItem';

@Entity()
export class ImportSourceItem {
  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'importSource.groupBasics',
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
    group: 'importSource.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 128 })
  title!: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 300,
    group: 'importSource.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 400,
    group: 'importSource.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ default: true })
  isActive: boolean = true;

  @ApiPropertyOptional({ type: () => ImportBatchItem, isArray: true })
  @OneToMany(() => ImportBatchItem, (batch) => batch.source)
  batches: Collection<Rel<ImportBatchItem>> = new Collection<
    Rel<ImportBatchItem>
  >(this);

  @ApiPropertyOptional({ type: () => ImportTemplateItem, isArray: true })
  @OneToMany(() => ImportTemplateItem, (template) => template.source)
  templates: Collection<Rel<ImportTemplateItem>> = new Collection<
    Rel<ImportTemplateItem>
  >(this);

  @ApiPropertyOptional({ type: () => ExternalRecordLinkItem, isArray: true })
  @OneToMany(() => ExternalRecordLinkItem, (link) => link.source)
  externalRecordLinks: Collection<Rel<ExternalRecordLinkItem>> = new Collection<
    Rel<ExternalRecordLinkItem>
  >(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
