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

  @Property({ unique: true })
  name: string;

  @Property()
  street: string;

  @Property()
  zip: string;

  @Property()
  city: string;

  @Property()
  phone: string;

  @Property()
  email: string;

  @Property()
  website: string;

  @Property({ default: true })
  isActive: boolean | null;

  @Property({ default: false })
  requirePasswordChange: boolean | null;

  // Relations
  @OneToMany(() => PersonItem, (x) => x.company)
  persons = new Collection<PersonItem>(this);

  @OneToMany(() => ContractItem, (contract) => contract.company)
  contracts = new Collection<ContractItem>(this);

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
