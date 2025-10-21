import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { NoteGroupItem } from './NoteGroupItem';

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
  person?: PersonItem | number | null;

  @ManyToOne(() => NoteGroupItem, { nullable: true })
  group!: NoteGroupItem | null;

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
