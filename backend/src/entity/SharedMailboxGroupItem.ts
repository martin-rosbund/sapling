import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { PersonItem } from './PersonItem';
import { SharedMailboxItem } from './SharedMailboxItem';

@Entity()
export class SharedMailboxGroupItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'sharedMailboxGroup.groupBasics',
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
    group: 'sharedMailboxGroup.groupContent',
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

  @ApiPropertyOptional({ default: 'mdi-email-lock-outline' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'sharedMailboxGroup.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-email-lock-outline', length: 64, nullable: false })
  icon: string = 'mdi-email-lock-outline';

  @ApiPropertyOptional({ default: '#1565C0' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'sharedMailboxGroup.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: '#1565C0', length: 32, nullable: false })
  color: string = '#1565C0';

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'sharedMailboxGroup.groupConfiguration',
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

  @ApiPropertyOptional({ type: () => SharedMailboxItem, isArray: true })
  @OneToMany(() => SharedMailboxItem, (item) => item.group)
  items: Collection<SharedMailboxItem> = new Collection<SharedMailboxItem>(
    this,
  );

  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem)
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
