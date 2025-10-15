import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';

@Entity()
export class KPIItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 128, nullable: false })
  name!: string;

  @Property({ length: 256, nullable: true })
  description?: string;

  @Property({ default: 'COUNT', length: 32, nullable: false })
  aggregation!: string; // z.B. "COUNT", "SUM", "AVG", "MIN", "MAX"

  @Property({ length: 128, nullable: false })
  field!: string; // z.B. "status", "priority", "product"

  @Property({ type: 'json', nullable: true })
  filter?: object;

  @Property({ type: 'json', nullable: true })
  groupBy?: string[];

  // Relations
  @ManyToOne(() => EntityItem, { nullable: true })
  targetEntity!: EntityItem | null;

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
