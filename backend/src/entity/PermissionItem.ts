import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { RoleItem } from './RoleItem';

/**
 * Entity representing permissions for a role on a specific entity.
 * Contains permission flags and relations to entities and roles.
 */
@Entity()
export class PermissionItem {
  /**
   * Permission to read the entity.
   */
  @Property({ default: true, nullable: false })
  allowRead!: boolean | null;

  /**
   * Permission to insert new records for the entity.
   */
  @Property({ default: true, nullable: false })
  allowInsert!: boolean | null;

  /**
   * Permission to update records for the entity.
   */
  @Property({ default: true, nullable: false })
  allowUpdate!: boolean | null;

  /**
   * Permission to delete records for the entity.
   */
  @Property({ default: true, nullable: false })
  allowDelete!: boolean | null;

  /**
   * Permission to show the entity in the UI.
   */
  @Property({ default: true, nullable: false })
  allowShow!: boolean | null;

  // Relations

  /**
   * The entity to which these permissions apply (primary relation).
   */
  @ManyToOne(() => EntityItem, { primary: true })
  entity!: EntityItem;

  /**
   * Roles that have these permissions.
   */
  @ManyToOne(() => RoleItem, { nullable: true, primary: true })
  role!: RoleItem | null;

  // System fields

  /**
   * Date and time when the permission was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the permission was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
