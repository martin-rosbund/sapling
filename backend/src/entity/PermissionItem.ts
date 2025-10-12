import { Collection, Entity, ManyToMany, ManyToOne, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { RoleItem } from './RoleItem';

@Entity()
export class PermissionItem {
  @Property({ default: true })
  allowRead: boolean | null;

  @Property({ default: true })
  allowInsert: boolean | null;

  @Property({ default: true })
  allowUpdate: boolean | null;

  @Property({ default: true })
  allowDelete: boolean | null;

  @Property({ default: true })
  allowShow: boolean | null;

  // Relations
  @ManyToOne(() => EntityItem, { primary: true })
  entity!: EntityItem;

  @ManyToMany(() => RoleItem, x => x.permissions)
  roles = new Collection<RoleItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
