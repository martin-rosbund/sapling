import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { PermissionItem } from './PermissionItem';
import { RoleStageItem } from './RoleStageItem';

@Entity()
export class RoleItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 64 })
  title: string;

  // Relations
  @ManyToMany(() => PersonItem, x => x.roles)
  persons = new Collection<PersonItem>(this);

  @ManyToMany(() => PermissionItem)
  permissions = new Collection<PermissionItem>(this);

  @ManyToOne(() => RoleStageItem)
  stage!: RoleStageItem;

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
