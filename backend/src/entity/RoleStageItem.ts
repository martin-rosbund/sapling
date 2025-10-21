import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { RoleItem } from './RoleItem';

/**
 * Entity representing a stage for user roles.
 * Used to group or categorize roles by stage.
 */
@Entity()
export class RoleStageItem {
  /**
   * Unique identifier for the role stage (primary key).
   */
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Title or name of the role stage.
   */
  @Property({ length: 64, nullable: false })
  title: string;

  /**
   * Roles that belong to this stage.
   */
  @OneToMany(() => RoleItem, (x) => x.stage)
  roles = new Collection<RoleItem>(this);

  // System fields

  /**
   * Date and time when the role stage was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the role stage was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
