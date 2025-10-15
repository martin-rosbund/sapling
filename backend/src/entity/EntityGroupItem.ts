import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EntityItem } from './EntityItem';

@Entity()
export class EntityGroupItem {
  @PrimaryKey({ length: 64 })
  handle: string;

  @Property({ default: 'folder', length: 64, nullable: false })
  icon!: string | null;

  //Relations
  @OneToMany(() => EntityItem, (x) => x.group)
  entities = new Collection<EntityItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
