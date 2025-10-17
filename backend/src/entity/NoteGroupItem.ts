import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { NoteItem } from './NoteItem';

@Entity()
export class NoteGroupItem {
  @PrimaryKey({ length: 64 })
  handle: string;

  @Property({ default: 'folder', length: 64, nullable: false })
  icon!: string | null;

  //Relations
  @OneToMany(() => NoteItem, (x) => x.group)
  notes = new Collection<NoteItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
