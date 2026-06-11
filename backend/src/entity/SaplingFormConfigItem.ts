import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

export type SaplingFormConfigScope = 'global' | 'role' | 'person';

export interface SaplingFormConfigPayload {
  schema: 'sapling.form-config.v1';
  entityHandle: string;
  fields?: Record<
    string,
    {
      visible?: boolean;
      group?: string | null;
      groupOrder?: number | null;
      order?: number | null;
      width?: 1 | 2 | 3 | 4 | null;
      tableVisible?: boolean;
      tableOrder?: number | null;
      mobileVisible?: boolean;
      mobileOrder?: number | null;
      label?: string | null;
      helpText?: string | null;
      placeholder?: string | null;
      required?: boolean | null;
      readonly?: boolean | null;
      renderer?: string | null;
      defaultValue?: unknown;
      validation?: unknown[];
      condition?: Record<string, unknown> | null;
      referenceFilter?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    }
  >;
  groups?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Entity()
export class SaplingFormConfigItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'saplingFormConfig.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'saplingFormConfig.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ enum: ['global', 'role', 'person'] })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: 'global', length: 16, nullable: false })
  scope: SaplingFormConfigScope = 'global';

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ length: 64, nullable: true })
  scopeHandle?: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 500,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 600,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isDefault = false;

  @ApiPropertyOptional({ default: 1 })
  @SaplingForm({
    order: 700,
    group: 'saplingFormConfig.groupContent',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 700,
    tableVisible: true,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @Property({ default: 1, nullable: false })
  version = 1;

  @ApiProperty()
  @SaplingForm({
    order: 800,
    group: 'saplingFormConfig.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 800,
    tableVisible: false,
    mobileOrder: 800,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: false })
  config!: SaplingFormConfigPayload;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson', 'isReadOnly'])
  @SaplingForm({
    order: 900,
    group: 'saplingFormConfig.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 900,
    tableVisible: true,
    mobileOrder: 900,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: Rel<PersonItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
