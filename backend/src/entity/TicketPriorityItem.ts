import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketPriorityItem {
  @PrimaryKey()
  handle!: string;

  @Property()
  description!: string;

  @Property()
  color!: string;

  @OneToMany(() => TicketItem, (x) => x.priority)
  tickets = new Collection<TicketItem>(this);

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
