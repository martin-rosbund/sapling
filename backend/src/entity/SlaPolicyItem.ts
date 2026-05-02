import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ContractItem } from './ContractItem';
import { SupportQueueItem } from './SupportQueueItem';
import { TicketItem } from './TicketItem';

@Entity()
export class SlaPolicyItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'slaPolicy.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'slaPolicy.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 256, nullable: true })
  description?: string;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'slaPolicy.groupTargets',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: 8, nullable: false })
  firstResponseHours = 8;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'slaPolicy.groupTargets',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: 40, nullable: false })
  resolutionHours = 40;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'slaPolicy.groupAppearance',
    groupOrder: 400,
    width: 1,
  })
  @Property({
    default: 'mdi-timer-sand',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-timer-sand';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'slaPolicy.groupAppearance',
    groupOrder: 400,
    width: 1,
  })
  @Property({ default: '#E53935', length: 32, nullable: false })
  color: string = '#E53935';

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'slaPolicy.groupConfiguration',
    groupOrder: 500,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ type: () => ContractItem, isArray: true })
  @OneToMany(() => ContractItem, (contract) => contract.slaPolicy)
  contracts: Collection<ContractItem> = new Collection<ContractItem>(this);

  @ApiPropertyOptional({ type: () => SupportQueueItem, isArray: true })
  @OneToMany(() => SupportQueueItem, (queue) => queue.defaultSlaPolicy)
  queues: Collection<SupportQueueItem> = new Collection<SupportQueueItem>(this);

  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (ticket) => ticket.slaPolicy)
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
