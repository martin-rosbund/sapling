import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { WorkHourWeekItem } from './WorkHourWeekItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing a work hour interval.
 */
@Entity()
export class WorkHourItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the note (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title of the work hour entry.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  title!: string;

  /**
   * Start time of the work interval.
   */
  @ApiProperty()
  @Property({ type: 'time', nullable: false })
  timeFrom!: string;

  /**
   * End time of the work interval.
   */
  @ApiProperty()
  @Property({ type: 'time', nullable: false })
  timeTo!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Work hour weeks where this entry is used for Monday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.monday)
  mondays = new Collection<WorkHourWeekItem>(this);

  /**
   * Work hour weeks where this entry is used for Tuesday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.tuesday)
  tuesdays = new Collection<WorkHourWeekItem>(this);

  /**
   * Work hour weeks where this entry is used for Wednesday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.wednesday)
  wednesdays = new Collection<WorkHourWeekItem>(this);

  /**
   * Work hour weeks where this entry is used for Thursday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.thursday)
  thursdays = new Collection<WorkHourWeekItem>(this);

  /**
   * Work hour weeks where this entry is used for Friday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.friday)
  fridays = new Collection<WorkHourWeekItem>(this);

  /**
   * Work hour weeks where this entry is used for Saturday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.saturday)
  saturdays = new Collection<WorkHourWeekItem>(this);

  /**
   * Work hour weeks where this entry is used for Sunday.
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem, isArray: true })
  @OneToMany(() => WorkHourWeekItem, (x) => x.sunday)
  sundays = new Collection<WorkHourWeekItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the entry was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the entry was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
