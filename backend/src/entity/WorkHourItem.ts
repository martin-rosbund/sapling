import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { WorkHourWeekItem } from './WorkHourWeekItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a work hour interval, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the work hour entry (primary key)
 * @property        {string}                title                Title of the work hour entry
 * @property        {string}                timeFrom             Start time of the work interval
 * @property        {string}                timeTo               End time of the work interval
 * @property        {Collection<WorkHourWeekItem>} mondays        Work hour weeks where this entry is used for Monday
 * @property        {Collection<WorkHourWeekItem>} tuesdays       Work hour weeks where this entry is used for Tuesday
 * @property        {Collection<WorkHourWeekItem>} wednesdays     Work hour weeks where this entry is used for Wednesday
 * @property        {Collection<WorkHourWeekItem>} thursdays      Work hour weeks where this entry is used for Thursday
 * @property        {Collection<WorkHourWeekItem>} fridays        Work hour weeks where this entry is used for Friday
 * @property        {Collection<WorkHourWeekItem>} saturdays      Work hour weeks where this entry is used for Saturday
 * @property        {Collection<WorkHourWeekItem>} sundays        Work hour weeks where this entry is used for Sunday
 * @property        {Date}                  createdAt           Date and time when the work hour entry was created
 * @property        {Date}                  updatedAt           Date and time when the work hour entry was last updated
 */
@Entity()
export class WorkHourItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the work hour entry (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the work hour entry.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'workHour.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 64, nullable: false })
  title!: string;

  /**
   * Start time of the work interval.
   * @type {string}
   */
  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'workHour.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ type: 'time', nullable: false })
  timeFrom!: string;

  /**
   * End time of the work interval.
   * @type {string}
   */
  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'workHour.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ type: 'time', nullable: false })
  timeTo!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Work hour weeks where this entry is used for Monday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.monday)
  mondays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );

  /**
   * Work hour weeks where this entry is used for Tuesday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.tuesday)
  tuesdays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );

  /**
   * Work hour weeks where this entry is used for Wednesday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.wednesday)
  wednesdays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );

  /**
   * Work hour weeks where this entry is used for Thursday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.thursday)
  thursdays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );

  /**
   * Work hour weeks where this entry is used for Friday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.friday)
  fridays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );

  /**
   * Work hour weeks where this entry is used for Saturday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.saturday)
  saturdays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );

  /**
   * Work hour weeks where this entry is used for Sunday.
   * @type {Collection<WorkHourWeekItem>}
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.sunday)
  sundays: Collection<WorkHourWeekItem> = new Collection<WorkHourWeekItem>(
    this,
  );
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
