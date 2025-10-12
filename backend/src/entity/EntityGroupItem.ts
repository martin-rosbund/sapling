import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';

@Entity()
export class EntityGroupItem {
  @PrimaryKey({ length: 64 })
  handle!: string;

  @Property({ default: 'folder', length: 64 })
  icon: string | null;

  //Relations
  @OneToMany(() => EntityItem, (x) => x.group)
  entities = new Collection<EntityItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
