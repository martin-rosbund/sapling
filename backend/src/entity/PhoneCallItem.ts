import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
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
export class PhoneCallItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiProperty()
  @Sapling(['isPhone', 'isValue'])
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupContact',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 64, nullable: false })
  phoneNumber!: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupBasics',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  reached = false;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty()
  @Sapling(['isSystem', 'isValue'])
  @SaplingGenericReference({ entityField: 'entity', handleField: 'reference' })
  @Property({ length: 128, nullable: false })
  reference!: string;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 200,
    group: 'phoneCall.groupReference',
    groupOrder: 400,
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
