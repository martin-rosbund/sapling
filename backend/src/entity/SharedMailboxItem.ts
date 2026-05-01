import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { SharedMailboxGroupItem } from './SharedMailboxGroupItem';

@Entity()
export class SharedMailboxItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'sharedMailbox.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiProperty()
  @Sapling(['isMail'])
  @SaplingForm({
    order: 200,
    group: 'sharedMailbox.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 256, nullable: false })
  email!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'sharedMailbox.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 256, nullable: true })
  description?: string;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'sharedMailbox.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ length: 32, nullable: false, default: 'azure' })
  provider: string = 'azure';

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'sharedMailbox.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ type: () => SharedMailboxGroupItem })
  @SaplingForm({
    order: 100,
    group: 'sharedMailbox.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => SharedMailboxGroupItem, { nullable: true })
  group?: Rel<SharedMailboxGroupItem>;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
