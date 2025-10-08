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

  @Property()
  title: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  version?: string;

  @Property({ nullable: true })
  description?: string;

  // Relations
  @ManyToMany(() => ContractItem , x => x.products)
  contracts = new Collection<ContractItem>(this);

  // System
  @Property({ nullable: true })
  createdAt: Date = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date;
}
