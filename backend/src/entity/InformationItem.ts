import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

@Entity()
@Unique({ properties: ['entity', 'reference'] })
export class InformationItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 64 })
  reference!: string;

  @ApiProperty()
  @Property({ length: 2048 })
  content!: string;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem)
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
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
