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

  @Property({ length: 64, nullable: false })
  description!: string;

  @OneToMany(() => TicketItem, (x) => x.status)
  tickets = new Collection<TicketItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
