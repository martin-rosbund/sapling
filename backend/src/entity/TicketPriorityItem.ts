import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TicketItem } from './TicketItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

@Entity()
export class TicketPriorityItem {
  //#region Properties: Persisted
  /**
   * Unique handle for the ticket priority (e.g., 'high', 'medium', 'low').
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Description of the priority (display name).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Color code (e.g., hex or color name) for UI representation.
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ length: 16, nullable: false })
  color!: string;

  /**
   * Icon representing the event type (default: mdi-calendar).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-chevron-down', length: 64, nullable: false })
  icon!: string | null;
  //#endregion

  //#region Properties: Relation
  /**
   * All tickets that have this priority.
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.priority)
  tickets = new Collection<TicketItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the priority was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the priority was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
