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

  @Property({ length: 128, nullable: false })
  title: string;

  @Property({ nullable: true, length: 512 })
  description?: string;

  @Property({ type: 'datetime', nullable: false })
  startDate: Date;

  @Property({ type: 'datetime', nullable: true })
  endDate?: Date | null;

  @Property({ default: true, nullable: false })
  isActive!: boolean | null;

  @Property({ default: 24, nullable: false })
  responseTimeHours!: number | null;

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
