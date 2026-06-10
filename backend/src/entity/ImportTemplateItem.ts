import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { ImportSourceItem } from './ImportSourceItem';
import { ImportTemplateValueMappingItem } from './ImportTemplateValueMappingItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class ImportTemplateItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'importTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128 })
  title!: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'importTemplate.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ type: () => ImportSourceItem })
  @SaplingForm({
    order: 100,
    group: 'importTemplate.groupScope',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: true,
  })
  @ManyToOne(() => ImportSourceItem, { nullable: false })
  source!: Rel<ImportSourceItem>;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'importTemplate.groupScope',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: true,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  targetEntity!: Rel<EntityItem>;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 300,
    group: 'importTemplate.groupScope',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ default: true })
  isActive: boolean = true;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'importTemplate.groupMapping',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 600,
    tableVisible: false,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @Property({ type: 'json' })
  mapping!: object;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  externalKeyColumns?: string[];

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  genericReferenceMapping?: object | null;

  @ApiPropertyOptional({
    type: () => ImportTemplateValueMappingItem,
    isArray: true,
  })
  @OneToMany(
    () => ImportTemplateValueMappingItem,
    (valueMapping) => valueMapping.importTemplate,
  )
  valueMappings: Collection<Rel<ImportTemplateValueMappingItem>> =
    new Collection<Rel<ImportTemplateValueMappingItem>>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
