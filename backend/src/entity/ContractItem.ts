import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { ProductItem } from './ProductItem';
import { CompanyItem } from './CompanyItem';

@Entity()
export class ContractItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 128 })
  title: string;

  @Property({ nullable: true, length: 512 })
  description?: string;

  @Property({ type: 'datetime' })
  startDate: Date;

  @Property({ type: 'datetime', nullable: true })
  endDate?: Date | null;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ nullable: true })
  responseTimeHours?: number;

  // Relations
  @ManyToOne(() => CompanyItem)
  company!: CompanyItem;

  @ManyToMany(() => ProductItem)
  products = new Collection<ProductItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date;
}
