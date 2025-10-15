import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { RoleItem } from './RoleItem';

@Entity()
export class PermissionItem {
  @Property({ default: true, nullable: false })
  allowRead!: boolean | null;

  @Property({ default: true, nullable: false })
  allowInsert!: boolean | null;

  @Property({ default: true, nullable: false })
  allowUpdate!: boolean | null;

  @Property({ default: true, nullable: false })
  allowDelete!: boolean | null;

  @Property({ default: true, nullable: false })
  allowShow!: boolean | null;

  // Relations
  @ManyToOne(() => EntityItem, { primary: true })
  entity!: EntityItem;

  @ManyToMany(() => RoleItem, (x) => x.permissions)
  roles = new Collection<RoleItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
