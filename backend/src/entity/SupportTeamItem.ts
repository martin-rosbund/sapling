import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { SupportQueueItem } from './SupportQueueItem';
import { TicketItem } from './TicketItem';

@Entity()
export class SupportTeamItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'supportTeam.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'supportTeam.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 256, nullable: true })
  description?: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'supportTeam.groupAppearance',
    groupOrder: 300,
    width: 1,
  })
  @Property({
    default: 'mdi-account-group-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-account-group-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'supportTeam.groupAppearance',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: '#3949AB', length: 32, nullable: false })
  color: string = '#3949AB';

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'supportTeam.groupConfiguration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ type: () => SupportQueueItem, isArray: true })
  @OneToMany(() => SupportQueueItem, (queue) => queue.team)
  queues: Collection<SupportQueueItem> = new Collection<SupportQueueItem>(this);

  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.supportTeam)
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
