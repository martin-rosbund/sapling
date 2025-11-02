import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { NoteItem } from './NoteItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing a group of notes.
 * Used to organize notes into logical groups.
 */
@Entity()
export class NoteGroupItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the note group (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the note group (default: mdi-folder).
   */
  @ApiProperty()
  @Property({ default: 'mdi-folder', length: 64, nullable: false })
  icon!: string | null;
  //#endregion

  //#region Properties: Relation
  /**
   * Notes belonging to this group.
   */
  @ApiPropertyOptional({ type: () => NoteItem, isArray: true })
  @OneToMany(() => NoteItem, (x) => x.group)
  notes = new Collection<NoteItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the note group was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the note group was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
