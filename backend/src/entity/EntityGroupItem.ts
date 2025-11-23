import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing a group of entities.
 * Used to organize entities into logical groups.
 */
@Entity()
export class EntityGroupItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the entity group (primary key).
   */
  @ApiProperty()
  @Sapling({ isShowInCompact: true })
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the group (default: mdi-folder).
   */
  @ApiProperty()
  @Sapling({ isIcon: true })
  @Property({ default: 'mdi-folder', length: 64, nullable: false })
  icon!: string | null;

  /**
   * Indicates if the group is expanded in the UI.
   */
  @ApiProperty()
  @Property({ default: true })
  isExpanded!: boolean | null;
  //#endregion

  //#region Properties: Relation
  /**
   * Entities belonging to this group.
   */
  @ApiPropertyOptional({ type: () => EntityItem, isArray: true })
  @OneToMany(() => EntityItem, (x) => x.group)
  entities = new Collection<EntityItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the group was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the group was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
