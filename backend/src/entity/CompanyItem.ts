import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { ContractItem } from './ContractItem';

@Entity()
export class CompanyItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ unique: true, length: 128, nullable: false })
  name: string;

  @Property({ length: 128, nullable: false })
  street: string;

  @Property({ length: 16, nullable: true })
  zip?: string | null;

  @Property({ length: 64, nullable: true })
  city?: string | null;

  @Property({ length: 32, nullable: true })
  phone?: string | null;

  @Property({ length: 128, nullable: true })
  email?: string | null;

  @Property({ length: 128, nullable: true })
  website?: string | null;

  @Property({ default: true, nullable: false })
  isActive!: boolean | null;

  // Relations
  @OneToMany(() => PersonItem, (x) => x.company)
  persons = new Collection<PersonItem>(this);

  @OneToMany(() => ContractItem, (x) => x.company)
  contracts = new Collection<ContractItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
