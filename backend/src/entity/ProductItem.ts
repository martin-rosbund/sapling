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

  @Property({ length: 128 })
  title: string;

  @Property({ length: 64 })
  name: string;

  @Property({ nullable: true, length: 32 })
  version?: string;

  @Property({ nullable: true, length: 512 })
  description?: string;

  // Relations
  @ManyToMany(() => ContractItem , x => x.products)
  contracts = new Collection<ContractItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date;
}
