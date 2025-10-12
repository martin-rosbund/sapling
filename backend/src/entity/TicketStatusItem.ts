import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketStatusItem {
  @PrimaryKey({ length: 64 })
  handle!: string;

  @Property({ length: 64 })
  description!: string;

  @OneToMany(() => TicketItem, (x) => x.status)
  tickets = new Collection<TicketItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
