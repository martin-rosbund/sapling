import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldDefinitionItem } from './CustomFieldDefinitionItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

export type CustomFieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'dateTime'
  | 'select'
  | 'multiSelect';

@Entity()
export class CustomFieldTypeItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: CustomFieldType;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'customFieldType.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional({ default: 'mdi-form-textbox' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 200,
    group: 'customFieldType.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-form-textbox', length: 64, nullable: false })
  icon = 'mdi-form-textbox';

  @ApiPropertyOptional({ default: '#546E7A' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 300,
    group: 'customFieldType.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color = '#546E7A';

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 400,
    group: 'customFieldType.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ default: 0 })
  sortOrder = 0;

  @ApiPropertyOptional({
    type: () => CustomFieldDefinitionItem,
    isArray: true,
  })
  @OneToMany(
    () => CustomFieldDefinitionItem,
    (definition) => definition.fieldType,
  )
  definitions: Collection<CustomFieldDefinitionItem> =
    new Collection<CustomFieldDefinitionItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
