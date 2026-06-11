import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import {
  CustomFieldTypeItem,
  type CustomFieldType,
} from './CustomFieldTypeItem';
import { CustomFieldValueItem } from './CustomFieldValueItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
@Unique({ properties: ['entity', 'fieldKey'] })
export class CustomFieldDefinitionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'customFieldDefinition.groupScope',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'customFieldDefinition.groupBasics',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 96 })
  fieldKey!: string;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'customFieldDefinition.groupBasics',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: true,
  })
  @Property({ length: 128 })
  label!: string;

  @ApiProperty({ type: () => CustomFieldTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'customFieldDefinition.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => CustomFieldTypeItem, { nullable: false })
  fieldType!: Rel<CustomFieldTypeItem> | CustomFieldType;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'customFieldDefinition.groupBehavior',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ default: false })
  isRequired: boolean = false;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 200,
    group: 'customFieldDefinition.groupBehavior',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @Property({ default: true })
  isActive: boolean = true;

  @ApiPropertyOptional({ default: 0 })
  @Property({ default: 0 })
  fieldOrder: number = 0;

  @ApiPropertyOptional({ default: true })
  @Property({ default: true })
  formVisible: boolean = true;

  @ApiPropertyOptional({ default: false })
  @Property({ default: false })
  tableVisible: boolean = false;

  @ApiPropertyOptional({ default: false })
  @Property({ default: false })
  mobileVisible: boolean = false;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'customFieldDefinition.groupBehavior',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 700,
    tableVisible: false,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  selectOptions?: Array<{ label: string; value: string }> | null;

  @ApiPropertyOptional({
    type: () => CustomFieldValueItem,
    isArray: true,
  })
  @OneToMany(() => CustomFieldValueItem, (value) => value.definition)
  values: Collection<CustomFieldValueItem> =
    new Collection<CustomFieldValueItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
