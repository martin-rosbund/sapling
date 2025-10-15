import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
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

  @Property({ length: 64, nullable: false })
  title: string;

  // Relations
  @ManyToMany(() => PersonItem, (x) => x.roles)
  persons = new Collection<PersonItem>(this);

  @ManyToMany(() => PermissionItem)
  permissions = new Collection<PermissionItem>(this);

  @ManyToOne(() => RoleStageItem)
  stage!: RoleStageItem;

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
