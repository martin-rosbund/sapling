import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class PhoneCallItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiProperty()
  @Sapling(['isPhone', 'isShowInCompact'])
  @Property({ length: 64, nullable: false })
  phoneNumber!: string;

  @ApiPropertyOptional()
  @Property({ length: 2048, nullable: true })
  note?: string | null;

  @ApiProperty()
  @Property({ nullable: false, default: false })
  reached = false;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 128, nullable: false })
  reference!: string;

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
