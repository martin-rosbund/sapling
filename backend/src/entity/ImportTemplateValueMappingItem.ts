import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ImportTemplateItem } from './ImportTemplateItem';

@Entity()
export class ImportTemplateValueMappingItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => ImportTemplateItem })
  @SaplingForm({
    order: 100,
    group: 'importTemplateValueMapping.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @ManyToOne(() => ImportTemplateItem, { nullable: false })
  importTemplate!: Rel<ImportTemplateItem>;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'importTemplateValueMapping.groupMapping',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 128 })
  targetField!: string;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'importTemplateValueMapping.groupMapping',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: true,
  })
  @Property({ type: 'text' })
  sourceValue!: string;

  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'importTemplateValueMapping.groupMapping',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: true,
  })
  @Property({ type: 'text' })
  targetValue!: string;

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 400,
    group: 'importTemplateValueMapping.groupMapping',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ length: 16, default: 'keep' })
  fallback: string = 'keep';

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
