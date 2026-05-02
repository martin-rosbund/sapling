import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class TeamsTemplateItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'teamsTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'teamsTemplate.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, length: 256 })
  description?: string;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'teamsTemplate.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: false, length: 8192 })
  bodyMarkdown!: string;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'teamsTemplate.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  isDefault: boolean = false;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'teamsTemplate.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'teamsTemplate.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
