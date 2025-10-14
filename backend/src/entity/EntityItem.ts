import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { EntityGroupItem } from './EntityGroupItem';
import { KPIItem } from './KPIItem';

@Entity()
export class EntityItem {
  @PrimaryKey({ length: 64 })
  handle!: string;

  @Property({ default: 'square-rounded', length: 64 })
  icon: string | null;

  @Property({ nullable: true, length: 128 })
  route: string | null;

  @Property({ default: false })
  isMenu: boolean | null = false;

  // Relations
  @ManyToOne(() => EntityGroupItem, { nullable: true })
  group!: EntityGroupItem | null;

  @OneToMany(() => KPIItem, (x) => x.targetEntity)
  kpis = new Collection<KPIItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
