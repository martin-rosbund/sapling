import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { EventTypeItem } from './EventTypeItem';
import { TicketItem } from './TicketItem';

@Entity()
export class EventItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ nullable: false, type: 'datetime' })
  startDate!: Date;

  @Property({ nullable: false, type: 'datetime' })
  endDate!: Date;

  @Property({ default: false, nullable: false })
  isAllDay!: boolean;

  @ManyToOne(() => PersonItem, { nullable: false })
  creator!: PersonItem;

  @Property({ length: 128, nullable: false })
  title!: string;

  @Property({ nullable: true, length: 1024 })
  description?: string;

  // Relations
  @ManyToOne(() => EventTypeItem, { nullable: false })
  type!: EventTypeItem;

  @ManyToOne(() => TicketItem, { nullable: true })
  ticket?: TicketItem;

  @ManyToMany(() => PersonItem, (x) => x.events)
  participants = new Collection<PersonItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}