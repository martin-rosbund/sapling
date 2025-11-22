import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { NoteGroupItem } from './NoteGroupItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing a note.
 * Contains note details and relations to person and note group.
 */
@Entity()
export class NoteItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the note (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title of the note.
   */
  @ApiProperty()
  @Sapling({ isShowInCompact: true })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description or content of the note (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 1024 })
  description?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person associated with this note (optional).
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling({ isPerson: true })
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: PersonItem | number | null;

  /**
   * The group this note belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => NoteGroupItem })
  @ManyToOne(() => NoteGroupItem, { nullable: true })
  group!: NoteGroupItem | null;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the note was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the note was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
