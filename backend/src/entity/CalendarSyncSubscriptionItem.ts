import { type Rel } from '@mikro-orm/core';
import { Entity, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

export type CalendarSyncRange = 'day' | 'week' | 'month';
export type CalendarSyncProvider = 'azure';

@Entity()
export class CalendarSyncSubscriptionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'calendarSyncSubscription.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  description: string = 'Outlook calendar import';

  @ApiPropertyOptional({ default: 'azure' })
  @SaplingForm({
    order: 100,
    group: 'calendarSyncSubscription.groupProvider',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false, default: 'azure' })
  provider: CalendarSyncProvider = 'azure';

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'calendarSyncSubscription.groupConfiguration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isActive: boolean = false;

  @ApiPropertyOptional({ default: 'week' })
  @SaplingForm({
    order: 200,
    group: 'calendarSyncSubscription.groupConfiguration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 16, nullable: false, default: 'week' })
  syncRange: CalendarSyncRange = 'week';

  @ApiPropertyOptional({ default: 60 })
  @Sapling(['isNumeric'])
  @SaplingForm({
    order: 300,
    group: 'calendarSyncSubscription.groupConfiguration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: 60, nullable: false })
  intervalMinutes: number = 60;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: true, type: 'datetime' })
  lastRunAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: true, type: 'datetime' })
  lastSuccessAt?: Date | null;

  @ApiPropertyOptional()
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ length: 512, nullable: true })
  lastError?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isReadOnly', 'isSystem', 'isNumeric'])
  @Property({ default: 0, nullable: false })
  lastImportedCount: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isReadOnly', 'isSystem', 'isNumeric'])
  @Property({ default: 0, nullable: false })
  lastCreatedCount: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isReadOnly', 'isSystem', 'isNumeric'])
  @Property({ default: 0, nullable: false })
  lastUpdatedCount: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isReadOnly', 'isSystem', 'isNumeric'])
  @Property({ default: 0, nullable: false })
  lastSkippedCount: number = 0;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 100,
    group: 'calendarSyncSubscription.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @OneToOne(() => PersonItem, { nullable: false, unique: true })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
