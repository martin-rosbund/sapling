import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { NoteItem } from './NoteItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

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
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the note group (default: mdi-folder).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-folder', length: 64, nullable: false })
  icon?: string = 'mdi-folder';
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
