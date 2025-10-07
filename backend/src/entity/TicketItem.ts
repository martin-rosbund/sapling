import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { TicketStatusItem } from './TicketStatusItem';
import { TicketPriorityItem } from './TicketPriorityItem';

@Entity()
export class TicketItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property()
  title!: string;

  @Property({ nullable: true })
  problemDescription?: string;

  @Property({ nullable: true })
  solutionDescription?: string;

  // Relations
  @ManyToOne(() => PersonItem, { nullable: true })
  assignee?: PersonItem;

  @ManyToOne(() => PersonItem, { nullable: true })
  creator?: PersonItem;

  @ManyToOne(() => TicketStatusItem)
  status!: TicketStatusItem;

  @ManyToOne(() => TicketPriorityItem, { nullable: true })
  priority?: TicketPriorityItem;

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
