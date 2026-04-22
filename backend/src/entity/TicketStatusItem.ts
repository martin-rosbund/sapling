import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { TicketItem } from './TicketItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a ticket status, including persisted properties, relations, and system fields.
 *
 * @property        {string}                handle        Unique handle for the ticket status (e.g., 'open', 'closed')
 * @property        {string}                description   Description of the status (display name)
 * @property        {string}                color         Color code (hex or color name) for UI representation
 * @property        {string}                icon          Icon representing the status (default: mdi-new-box)
 * @property        {Collection<TicketItem>} tickets      All tickets that have this status
 * @property        {Date}                  createdAt     Date and time when the ticket status was created
 * @property        {Date}                  updatedAt     Date and time when the ticket status was last updated
 */
@Entity()
export class TicketStatusItem {
  //#region Properties: Persisted
  /**
   * Unique handle for the ticket status (e.g., 'open', 'closed').
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Description of the status (display name).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({ order: 100, group: 'ticketStatus.groupContent', width: 4 })
  @Property({ length: 64, nullable: false })
  description!: string;

  /**
   * Color code (e.g., hex or color name) for UI representation.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({ order: 100, group: 'ticketStatus.groupAppearance', width: 1 })
  @Property({ length: 16, nullable: false })
  color!: string;

  /**
   * Icon representing the status (default: mdi-new-box).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({ order: 200, group: 'ticketStatus.groupAppearance', width: 1 })
  @Property({ default: 'mdi-new-box', length: 64, nullable: false })
  icon?: string = 'mdi-new-box';
  //#endregion

  //#region Properties: Relation
  /**
   * All tickets that have this status.
   * @type {Collection<TicketItem>}
   */
  @ApiPropertyOptional({ type: () => TicketItem, isArray: true })
  @OneToMany(() => TicketItem, (x) => x.status)
  tickets: Collection<TicketItem> = new Collection<TicketItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the ticket status was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the ticket status was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
