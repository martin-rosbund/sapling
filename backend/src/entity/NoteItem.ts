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
  handle?: number;

  /**
   * Title of the note.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
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
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: PersonItem | number;

  /**
   * The group this note belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => NoteGroupItem })
  @ManyToOne(() => NoteGroupItem, { nullable: true })
  group!: NoteGroupItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
