import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EventItem } from './EventItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

@Entity()
export class EventStatusItem {
  //#region Properties: Persisted
  /**
   * Unique handle for the event status (e.g., 'scheduled', 'completed').
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Description of the status (display name).
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
  //#endregion

  //#region Properties: Relation
  /**
   * All events that have this status.
   */
  @ApiPropertyOptional({ type: () => EventItem, isArray: true })
  @OneToMany(() => EventItem, (x) => x.status)
  events = new Collection<EventItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the status was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the status was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
