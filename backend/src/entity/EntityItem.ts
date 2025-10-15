import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EntityGroupItem } from './EntityGroupItem';
import { KPIItem } from './KPIItem';

@Entity()
export class EntityItem {
  @PrimaryKey({ length: 64 })
  handle: string;

  @Property({ default: 'square-rounded', length: 64, nullable: false })
  icon!: string | null;

  @Property({ nullable: true, length: 128 })
  route?: string | null;

  @Property({ default: false, nullable: false })
  isMenu!: boolean | null;

  @Property({ default: false })
  canInsert!: boolean | null;

  @Property({ default: false })
  canUpdate!: boolean | null;

  @Property({ default: false })
  canDelete!: boolean | null;

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
