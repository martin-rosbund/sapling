import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { EntityItem } from './EntityItem';

/**
 * Entity representing a favorite item for a person and entity.
 */
@Entity()
export class FavoriteItem {
  /**
   * Unique identifier for the favorite item (primary key, autoincrement).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number;

  /**
   * Title of the favorite item (not null).
   */
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Reference to the person (not null).
   */
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * Reference to the entity (not null).
   */
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: EntityItem;

  /**
   * Optional query parameter (nullable).
   */
  @Property({ type: 'json', nullable: true })
  filter?: object;

  /**
   * Date and time when the favorite was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the favorite was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}