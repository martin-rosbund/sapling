import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { HolidayGroupItem } from './HolidayGroupItem';

/**
 * Entity representing a public holiday entry for calendar display.
 */
@Entity()
export class HolidayItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'holiday.groupBasics',
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
    group: 'holiday.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, length: 1024 })
  description?: string;

  @ApiPropertyOptional({ type: () => HolidayGroupItem })
  @SaplingForm({
    order: 200,
    group: 'holiday.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => HolidayGroupItem, { nullable: false })
  group!: HolidayGroupItem;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isOrderDESC', 'isToday', 'isDateStart'])
  @SaplingForm({
    order: 100,
    group: 'holiday.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isToday', 'isDateEnd'])
  @SaplingForm({
    order: 200,
    group: 'holiday.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 300,
    group: 'holiday.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isAllDay: boolean = true;

  @ApiPropertyOptional({ default: 'mdi-calendar-alert' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'holiday.groupAppearance',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-calendar-alert', length: 64, nullable: false })
  icon?: string = 'mdi-calendar-alert';

  @ApiPropertyOptional({ default: '#C62828' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'holiday.groupAppearance',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: '#C62828', length: 32, nullable: false })
  color: string = '#C62828';

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
