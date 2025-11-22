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
 * Entity representing a work hour interval.
 */
@Entity()
export class WorkHourWeekItem {
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
  @Sapling({ isShowInCompact: true })
  @Property({ length: 64, nullable: false })
  title!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Work hours for Monday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  monday!: WorkHourItem;

  /**
   * Work hours for Tuesday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  tuesday!: WorkHourItem;

  /**
   * Work hours for Wednesday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  wednesday!: WorkHourItem;

  /**
   * Work hours for Thursday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  thursday!: WorkHourItem;

  /**
   * Work hours for Friday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  friday!: WorkHourItem;

  /**
   * Work hours for Saturday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  saturday!: WorkHourItem;

  /**
   * Work hours for Sunday.
   */
  @ApiPropertyOptional({ type: () => WorkHourItem })
  @ManyToOne(() => WorkHourItem, { nullable: true })
  sunday!: WorkHourItem;

  /**
   * Companies using this work hour week.
   */
  @ApiPropertyOptional({ type: () => CompanyItem, isArray: true })
  @OneToMany(() => CompanyItem, (x) => x.workWeek)
  companies = new Collection<CompanyItem>(this);

  /**
   * Persons using this work hour week.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (x) => x.workWeek)
  persons = new Collection<PersonItem>(this);
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
