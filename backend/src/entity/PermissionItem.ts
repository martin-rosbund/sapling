import { Entity, ManyToOne, Property } from '@mikro-orm/core';
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

  @ManyToOne(() => RoleItem, { primary: true })
  role!: RoleItem;

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
