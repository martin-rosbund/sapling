import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * Persisted template that can be loaded as a personal worklist favorite.
 */
@Entity()
export class FavoriteTemplateItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'favoriteTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'favoriteTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'favoriteTemplate.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ type: 'json', nullable: true })
  filter?: object;

  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'favoriteTemplate.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  isRecommended = false;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
