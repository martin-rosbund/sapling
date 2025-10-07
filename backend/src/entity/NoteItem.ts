import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';

@Entity()
export class NoteItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property()
  title!: string;

  @Property({ nullable: true })
  description?: string;

  // Relations
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: PersonItem;

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
