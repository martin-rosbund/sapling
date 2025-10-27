import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  Cascade,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { PermissionItem } from './PermissionItem';
import { RoleStageItem } from './RoleStageItem';

/**
 * Entity representing a user role.
 * Contains role details and relations to persons, permissions, and stages.
 */
@Entity()
export class RoleItem {
  /**
   * Unique identifier for the role (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title or name of the role.
   */
  @Property({ length: 64, nullable: false })
  title: string;

  // Relations

  /**
   * Persons assigned to this role.
   */
  @ManyToMany(() => PersonItem, (x) => x.roles, { cascade: [Cascade.PERSIST] })
  persons = new Collection<PersonItem>(this);

  /**
   * Permissions associated with this role.
   */
  @ManyToMany(() => PermissionItem)
  permissions = new Collection<PermissionItem>(this);

  /**
   * The stage this role belongs to.
   */
  @ManyToOne(() => RoleStageItem)
  stage!: RoleStageItem;

  // System fields

  /**
   * Date and time when the role was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the role was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
