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
  @PrimaryKey()
  handle!: string;

  @Property()
  description!: string;

  @OneToMany(() => TicketItem, (x) => x.status)
  tickets = new Collection<TicketItem>(this);

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
