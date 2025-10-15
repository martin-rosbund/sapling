import {
  Entity,
  PrimaryKey,
  Property,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { ContractItem } from './ContractItem';

@Entity()
export class ProductItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 128, nullable: false })
  title: string;

  @Property({ length: 64, nullable: false })
  name: string;

  @Property({ default: '1.0.0', nullable: true, length: 32 })
  version?: string | null;

  @Property({ nullable: true, length: 512 })
  description?: string;

  // Relations
  @ManyToMany(() => ContractItem, (x) => x.products)
  contracts = new Collection<ContractItem>(this);

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
