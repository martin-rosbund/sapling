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

  @Property({ unique: true, length: 128 })
  name: string;

  @Property({ length: 128 })
  street: string;

  @Property({ length: 16 })
  zip: string;

  @Property({ length: 64 })
  city: string;

  @Property({ length: 32 })
  phone: string;

  @Property({ length: 128 })
  email: string;

  @Property({ length: 128 })
  website: string;

  @Property({ default: true })
  isActive: boolean | null;

  @Property({ default: false })
  requirePasswordChange: boolean | null;

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
