import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class PhoneCallItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiProperty()
  @Sapling(['isPhone', 'isShowInCompact'])
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupContact',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 64, nullable: false })
  phoneNumber!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 2048, nullable: true })
  note?: string | null;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'phoneCall.groupBasics',
    groupOrder: 300,
    width: 2,
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
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 128, nullable: false })
  reference!: string;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 200,
    group: 'phoneCall.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
