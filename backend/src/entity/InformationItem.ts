import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import {
  Sapling,
  SaplingForm,
  SaplingGenericReference,
} from './global/entity.decorator';

@Entity()
@Unique({ properties: ['entity', 'reference'] })
export class InformationItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiProperty()
  @Sapling(['isSystem', 'isValue'])
  @SaplingGenericReference({ entityField: 'entity', handleField: 'reference' })
  @Property({ length: 64 })
  reference!: string;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'information.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'text' })
  content!: string;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'information.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem)
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 200,
    group: 'information.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
