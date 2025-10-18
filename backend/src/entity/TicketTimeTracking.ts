import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketTimeTrackingItem {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Property({ type: 'datetime', nullable: false })
  von!: Date;

  @Property({ type: 'datetime', nullable: false })
  bis!: Date;

  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  @ManyToOne(() => TicketItem, { nullable: false })
  ticket!: TicketItem;

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}