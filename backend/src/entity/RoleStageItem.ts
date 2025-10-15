import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { RoleItem } from './RoleItem';

@Entity()
export class RoleStageItem {
  @PrimaryKey({ length: 64 })
  handle!: string;

  @Property({ length: 64, nullable: false })
  description!: string;

  // Relations
  @OneToMany(() => RoleItem, (x) => x.stage)
  roles = new Collection<RoleItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
