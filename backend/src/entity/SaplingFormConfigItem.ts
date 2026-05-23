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
  fields?: Record<string, unknown>;
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
  })
  @Property({ default: 'global', length: 16, nullable: false })
  scope: SaplingFormConfigScope = 'global';

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 2,
  })
  @Property({ length: 64, nullable: true })
  scopeHandle?: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 500,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 600,
    group: 'saplingFormConfig.groupScope',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  isDefault = false;

  @ApiPropertyOptional({ default: 1 })
  @SaplingForm({
    order: 700,
    group: 'saplingFormConfig.groupContent',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: 1, nullable: false })
  version = 1;

  @ApiProperty()
  @SaplingForm({
    order: 800,
    group: 'saplingFormConfig.groupContent',
    groupOrder: 300,
    width: 4,
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
