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
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
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
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({
    default: 'mdi-inbox-arrow-down-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-inbox-arrow-down-outline';

  @ApiPropertyOptional({ default: '#00897B' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'supportQueue.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: '#00897B', length: 32, nullable: false })
  color: string = '#00897B';

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'supportQueue.groupConfiguration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
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
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
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
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => SlaPolicyItem, { nullable: true })
  defaultSlaPolicy?: Rel<SlaPolicyItem>;

  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.supportQueue)
  tickets: Collection<TicketItem> = new Collection<TicketItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
