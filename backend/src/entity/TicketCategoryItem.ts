import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { TicketItem } from './TicketItem';
import { TicketTypeItem } from './TicketTypeItem';

@Entity()
export class TicketCategoryItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'ticketCategory.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'ticketCategory.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({
    default: 'mdi-shape-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-shape-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'ticketCategory.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#5C6BC0', length: 32, nullable: false })
  color: string = '#5C6BC0';

  @ApiPropertyOptional({ type: () => TicketTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'ticketCategory.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => TicketTypeItem, { nullable: true })
  type?: Rel<TicketTypeItem>;

  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.category)
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
