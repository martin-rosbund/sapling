import {
  Collection,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { PermissionItem } from './PermissionItem';

@Entity()
export class RoleItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property()
  title: string;

  // Relations
  @ManyToMany(() => PersonItem, (x) => x.groups)
  persons = new Collection<PersonItem>(this);

  @OneToMany(() => PermissionItem, (x) => x.role)
  permissions = new Collection<PermissionItem>(this);

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
