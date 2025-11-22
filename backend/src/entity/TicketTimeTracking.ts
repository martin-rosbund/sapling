import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { TicketItem } from './TicketItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

@Entity()
export class TicketTimeTrackingItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the time tracking entry.
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  id!: number;
  //#endregion

  //#region Properties: Relation
  /**
   * Description of the status (display name).
   */
  @ApiProperty()
  @Sapling({ isShowInCompact: true })
  @Property({ length: 64, nullable: false })
  title!: string;

  /**
   * Description of the status (display name).
   */
  @ApiProperty()
  @Property({ length: 256, nullable: false })
  description!: string;

  /**
   * Person who performed the work.
   */
  @ApiProperty({ type: () => PersonItem })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * Ticket to which this time entry belongs.
   */
  @ApiProperty({ type: () => TicketItem })
  @ManyToOne(() => TicketItem, { nullable: false })
  ticket!: TicketItem;
  //#endregion

  //#region Properties: Persisted
  /**
   * Start time of the tracked work interval.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling({ isShowInCompact: true })
  @Property({ type: 'datetime', nullable: false })
  von!: Date;

  /**
   * End time of the tracked work interval.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling({ isShowInCompact: true })
  @Property({ type: 'datetime', nullable: false })
  bis!: Date;
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
