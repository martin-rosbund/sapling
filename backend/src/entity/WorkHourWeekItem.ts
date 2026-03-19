import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { WorkHourItem } from './WorkHourItem';
import { PersonItem } from './PersonItem';
import { CompanyItem } from './CompanyItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a work hour week, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the work hour week entry (primary key)
 * @property        {string}                title                Title of the work hour week entry
 * @property        {WorkHourItem}          monday               Work hours for Monday
 * @property        {WorkHourItem}          tuesday              Work hours for Tuesday
 * @property        {WorkHourItem}          wednesday            Work hours for Wednesday
 * @property        {WorkHourItem}          thursday             Work hours for Thursday
 * @property        {WorkHourItem}          friday               Work hours for Friday
 * @property        {WorkHourItem}          saturday             Work hours for Saturday
 * @property        {WorkHourItem}          sunday               Work hours for Sunday
 * @property        {Collection<CompanyItem>} companies          Companies using this work hour week
 * @property        {Collection<PersonItem>} persons             Persons using this work hour week
 * @property        {Date}                  createdAt           Date and time when the work hour week was created
 * @property        {Date}                  updatedAt           Date and time when the work hour week was last updated
 */
@Entity()
export class WorkHourWeekItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the work hour week entry (primary key).
   * @type {number}
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Title of the work hour week entry.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  title!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Work hours for Monday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  monday!: WorkHourItem;

  /**
   * Work hours for Tuesday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  tuesday!: WorkHourItem;

  /**
   * Work hours for Wednesday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  wednesday!: WorkHourItem;

  /**
   * Work hours for Thursday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  thursday!: WorkHourItem;

  /**
   * Work hours for Friday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  friday!: WorkHourItem;

  /**
   * Work hours for Saturday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  saturday!: WorkHourItem;

  /**
   * Work hours for Sunday.
   * @type {WorkHourItem}
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  sunday!: WorkHourItem;

  /**
   * Companies using this work hour week.
   * @type {Collection<CompanyItem>}
   */
  @ApiPropertyOptional({ type: () => CompanyItem, isArray: true })
  @OneToMany(() => CompanyItem, (x) => x.workWeek)
  companies = new Collection<CompanyItem>(this);

  /**
   * Persons using this work hour week.
   * @type {Collection<PersonItem>}
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (x) => x.workWeek)
  persons = new Collection<PersonItem>(this);
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
