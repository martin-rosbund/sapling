import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EntityItem } from './EntityItem';

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
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the group (default: mdi-folder).
   */
  @Property({ default: 'mdi-folder', length: 64, nullable: false })
  icon!: string | null;
  //#endregion

  //#region Properties: Relation
  /**
   * Entities belonging to this group.
   */
  @OneToMany(() => EntityItem, (x) => x.group)
  entities = new Collection<EntityItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the group was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the group was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
