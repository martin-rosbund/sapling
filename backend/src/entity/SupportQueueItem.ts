import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { SlaPolicyItem } from './SlaPolicyItem';
import { SupportTeamItem } from './SupportTeamItem';
import { TicketItem } from './TicketItem';

@Entity()
export class SupportQueueItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 256, nullable: true })
  description?: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupAppearance',
    groupOrder: 300,
    width: 1,
  })
  @Property({
    default: 'mdi-inbox-arrow-down-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-inbox-arrow-down-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'supportQueue.groupAppearance',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: '#00897B', length: 32, nullable: false })
  color: string = '#00897B';

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupConfiguration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiProperty({ type: () => SupportTeamItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => SupportTeamItem, { nullable: false })
  team!: Rel<SupportTeamItem>;

  @ApiPropertyOptional({ type: () => SlaPolicyItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'supportQueue.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => SlaPolicyItem, { nullable: true })
  defaultSlaPolicy?: Rel<SlaPolicyItem>;

  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.supportQueue)
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
