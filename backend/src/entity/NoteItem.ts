import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';

@Entity()
export class NoteItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 128, nullable: false })
  title!: string;

  @Property({ nullable: true, length: 1024 })
  description?: string;

  // Relations
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: PersonItem;

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
