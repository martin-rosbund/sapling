import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { EventItem } from './EventItem';

@Entity()
export class EventTypeItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 128, nullable: false })
  title!: string;

  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon!: string | null;

  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;

  // Relations
  @OneToMany(() => EventItem, (event) => event.type)
  events = new Collection<EventItem>(this);
}