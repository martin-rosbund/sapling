import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EntityGroupItem } from './EntityGroupItem';
import { KpiItem } from './KpiItem';
import { FavoriteItem } from './FavoriteItem';

/**
 * Entity representing a generic entity in the system.
 * Contains entity details, permissions, and relations to groups and KPIs.
 */
@Entity()
export class EntityItem {
  /**
   * Unique identifier for the entity (primary key).
   */
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the entity (default: square-rounded).
   */
  @Property({ default: 'square-rounded', length: 64, nullable: false })
  icon!: string | null;

  /**
   * Optional route for the entity (e.g., frontend path).
   */
  @Property({ nullable: true, length: 128 })
  route?: string | null;

  /**
   * Indicates if the entity should appear in the menu.
   */
  @Property({ default: false, nullable: false })
  isMenu!: boolean | null;

  /**
   * Indicates if insert operations are allowed for this entity.
   */
  @Property({ default: false })
  canInsert!: boolean | null;

  /**
   * Indicates if update operations are allowed for this entity.
   */
  @Property({ default: false })
  canUpdate!: boolean | null;

  /**
   * Indicates if delete operations are allowed for this entity.
   */
  @Property({ default: false })
  canDelete!: boolean | null;

  /**
   * Indicates if show permissions can be revoked for this entity.
   */
  @Property({ default: true })
  canShow!: boolean | null;

  // Relations

  /**
   * The group this entity belongs to (optional).
   */
  @ManyToOne(() => EntityGroupItem, { nullable: true })
  group!: EntityGroupItem | null;

  /**
   * KPIs associated with this entity.
   */
  @OneToMany(() => KpiItem, (x) => x.targetEntity)
  kpis = new Collection<KpiItem>(this);

  /**
   * Favorite items referencing this entity.
   */
  @OneToMany(() => FavoriteItem, (favorite) => favorite.entity)
  favorites = new Collection<FavoriteItem>(this);

  // System fields

  /**
   * Date and time when the entity was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the entity was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
