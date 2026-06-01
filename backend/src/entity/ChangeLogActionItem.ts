import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeLogItem } from './ChangeLogItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class ChangeLogActionItem {
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @Property({ primary: true, length: 32 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'changeLogAction.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'changeLogAction.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 256, nullable: true })
  description?: string | null;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 300,
    group: 'changeLogAction.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({
    default: 'mdi-pencil-circle-outline',
    length: 64,
    nullable: false,
  })
  icon: string = 'mdi-pencil-circle-outline';

  @ApiPropertyOptional({ default: '#546E7A' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 400,
    group: 'changeLogAction.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color: string = '#546E7A';

  @ApiPropertyOptional({ type: () => ChangeLogItem, isArray: true })
  @OneToMany(() => ChangeLogItem, (log) => log.action)
  logs: Collection<ChangeLogItem> = new Collection<ChangeLogItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
