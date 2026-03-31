import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  OneToOne,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { EventTypeItem } from './EventTypeItem';
import { TicketItem } from './TicketItem';
import { EventStatusItem } from './EventStatusItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventAzureItem } from './EventAzureItem';
import { EventGoogleItem } from './EventGoogleItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a calendar event, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the event (primary key)
 * @property        {string}                title               Title of the event
 * @property        {PersonItem}            creator             The person who created the event
 * @property        {string}                description         Description of the event (optional)
 * @property        {Date}                  startDate           Start date and time of the event
 * @property        {Date}                  endDate             End date and time of the event
 * @property        {boolean}               isAllDay            Indicates if the event lasts all day
 * @property        {string}                onlineMeetingURL    URL for the online meeting (optional)
 * @property        {EventTypeItem}         type                The type/category of the event
 * @property        {TicketItem}            ticket              The ticket associated with this event (optional)
 * @property        {Collection<PersonItem>} participants       Persons participating in this event
 * @property        {SalesOpportunityItem}  salesOpportunity    Sales Opportunity related to this ticket
 * @property        {EventStatusItem}       status              The current status of the event
 * @property        {EventAzureItem}        azure               The Azure calendar item associated with this event (optional)
 * @property        {EventGoogleItem}       google              The Google calendar item associated with this event (optional)
 * @property        {Date}                  createdAt           Date and time when the event was created
 * @property        {Date}                  updatedAt           Date and time when the event was last updated
 */
@Entity()
export class EventItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the event (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the event.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * The person who created the event.
   * @type {PersonItem}
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner'])
  @ManyToOne(() => PersonItem, { nullable: false })
  creator!: Rel<PersonItem>;

  /**
   * Description of the event (optional).
   * @type {string}
   */
  @ApiProperty()
  @Property({ nullable: true, length: 1024 })
  description?: string;

  /**
   * Start date and time of the event.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isShowInCompact', 'isOrderDESC'])
  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  /**
   * End date and time of the event.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isShowInCompact'])
  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  /**
   * Indicates if the event lasts all day.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: false, nullable: false })
  isAllDay!: boolean;

  /**
   * URL for the online meeting (optional).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isLink'])
  @Property({ nullable: true, length: 512 })
  onlineMeetingURL!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The type/category of the event.
   * @type {EventTypeItem}
   */
  @ApiProperty({ type: () => EventTypeItem })
  @ManyToOne(() => EventTypeItem, { defaultRaw: `'internal'`, nullable: false })
  type!: EventTypeItem;

  /**
   * The ticket associated with this event (optional).
   * @type {TicketItem}
   */
  @ApiPropertyOptional({ type: () => TicketItem })
  @ManyToOne(() => TicketItem, { nullable: true })
  ticket?: Rel<TicketItem>;

  /**
   * Persons participating in this event.
   * @type {Collection<PersonItem>}
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem, (x) => x.events)
  participants: Collection<PersonItem> = new Collection<PersonItem>(this);

  /**
   * Sales Opportunity related to this ticket.
   * @type {SalesOpportunityItem}
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem })
  @ManyToOne(() => SalesOpportunityItem, { nullable: true })
  salesOpportunity?: SalesOpportunityItem;

  /**
   * The current status of the event.
   * @type {EventStatusItem}
   */
  @ApiProperty({ type: () => EventStatusItem })
  @ManyToOne(() => EventStatusItem, {
    defaultRaw: `'scheduled'`,
    nullable: false,
  })
  status!: EventStatusItem;

  /**
   * The Azure calendar item associated with this event (optional).
   * @type {EventAzureItem}
   */
  @ApiPropertyOptional({ type: () => EventAzureItem })
  @Sapling(['isHideAsReference'])
  @OneToOne(() => EventAzureItem, (x) => x.event)
  azure?: EventAzureItem;

  /**
   * The Google calendar item associated with this event (optional).
   * @type {EventGoogleItem}
   */
  @ApiPropertyOptional({ type: () => EventGoogleItem })
  @Sapling(['isHideAsReference'])
  @OneToOne(() => EventGoogleItem, (x) => x.event)
  google?: EventGoogleItem;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the event was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the event was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
