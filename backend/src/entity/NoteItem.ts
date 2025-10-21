import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { NoteGroupItem } from './NoteGroupItem';

/**
 * Entity representing a note.
 * Contains note details and relations to person and note group.
 */
@Entity()
export class NoteItem {
  /**
   * Unique identifier for the note (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title of the note.
   */
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description or content of the note (optional).
   */
  @Property({ nullable: true, length: 1024 })
  description?: string;

  // Relations

  /**
   * The person associated with this note (optional).
   */
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: PersonItem | number | null;

  /**
   * The group this note belongs to (optional).
   */
  @ManyToOne(() => NoteGroupItem, { nullable: true })
  group!: NoteGroupItem | null;

  // System fields

  /**
   * Date and time when the note was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the note was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
