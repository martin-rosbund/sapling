import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { NoteGroupItem } from './NoteGroupItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * @class NoteItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a note.
 * @description Contains note details and relations to person and note group. Used to store and organize individual notes in the system.
 *
 * @property {number} handle - Unique identifier for the note (primary key).
 * @property {string} title - Title of the note.
 * @property {string} [description] - Description or content of the note (optional).
 * @property {PersonItem|number} [person] - The person associated with this note (optional).
 * @property {NoteGroupItem} group - The group this note belongs to (optional).
 * @property {Date} createdAt - Date and time when the note was created.
 * @property {Date} updatedAt - Date and time when the note was last updated.
 */
@Entity()
export class NoteItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the note (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the note.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({ order: 100, group: 'note.groupBasics', width: 2 })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description or content of the note (optional).
   */
  @ApiPropertyOptional()
  @SaplingForm({ order: 100, group: 'note.groupContent', width: 4 })
  @Property({ nullable: true, length: 1024 })
  description?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person associated with this note (optional).
   */
  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({ order: 100, group: 'note.groupReference', width: 2 })
  @ManyToOne(() => PersonItem, { nullable: true })
  person?: PersonItem | number;

  /**
   * The group this note belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => NoteGroupItem })
  @SaplingForm({ order: 200, group: 'note.groupReference', width: 2 })
  @ManyToOne(() => NoteGroupItem, { nullable: true })
  group!: NoteGroupItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
