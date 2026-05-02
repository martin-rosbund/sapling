import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { TicketItem } from './TicketItem';
import { TicketCategoryItem } from './TicketCategoryItem';

@Entity()
export class TicketTypeItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'ticketType.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'ticketType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({
    default: 'mdi-alert-circle-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-alert-circle-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'ticketType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#F44336', length: 32, nullable: false })
  color: string = '#F44336';

  @ApiPropertyOptional({ type: () => TicketCategoryItem, isArray: true })
  @OneToMany(() => TicketCategoryItem, (category) => category.type)
  categories: Collection<TicketCategoryItem> =
    new Collection<TicketCategoryItem>(this);

  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.type)
  tickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
