import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { NoteItem } from './NoteItem';

/**
 * Entity representing a group of notes.
 * Used to organize notes into logical groups.
 */
@Entity()
export class NoteGroupItem {
  /**
   * Unique identifier for the note group (primary key).
   */
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the note group (default: mdi-folder).
   */
  @Property({ default: 'mdi-folder', length: 64, nullable: false })
  icon!: string | null;

  // Relations

  /**
   * Notes belonging to this group.
   */
  @OneToMany(() => NoteItem, (x) => x.group)
  notes = new Collection<NoteItem>(this);

  // System fields

  /**
   * Date and time when the note group was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the note group was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
