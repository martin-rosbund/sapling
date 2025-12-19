import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { EventItem } from './EventItem';

/**
 * Entity representing an event type or category.
 * Used to classify events and provide icons/colors for display.
 */
@Entity()
export class EventGoogleItem {
  //#region Properties: Persisted
  /**
   * Session number for the session (not primary key).
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 128, nullable: false })
  referenceHandle!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The event associated with this Azure item.
   */
  @ApiProperty({ type: () => EventItem })
  @OneToOne(() => EventItem, { primary: true, nullable: false })
  event!: EventItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the favorite was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the favorite was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
