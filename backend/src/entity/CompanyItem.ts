import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { ContractItem } from './ContractItem';

/**
 * Entity representing a company.
 * Contains company details and relations to persons and contracts.
 */
@Entity()
export class CompanyItem {
  /**
   * Unique identifier for the company (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Name of the company (must be unique).
   */
  @Property({ unique: true, length: 128, nullable: false })
  name: string;

  /**
   * Street address of the company.
   */
  @Property({ length: 128, nullable: false })
  street: string;

  /**
   * ZIP or postal code.
   */
  @Property({ length: 16, nullable: true })
  zip?: string | null;

  /**
   * City where the company is located.
   */
  @Property({ length: 64, nullable: true })
  city?: string | null;

  /**
   * Company phone number.
   */
  @Property({ length: 32, nullable: true })
  phone?: string | null;

  /**
   * Company email address.
   */
  @Property({ length: 128, nullable: true })
  email?: string | null;

  /**
   * Company website URL.
   */
  @Property({ length: 128, nullable: true })
  website?: string | null;

  /**
   * Indicates if the company is active.
   */
  @Property({ default: true, nullable: false })
  isActive!: boolean | null;

  // Relations

  /**
   * Persons associated with this company.
   */
  @OneToMany(() => PersonItem, (x) => x.company)
  persons = new Collection<PersonItem>(this);

  /**
   * Contracts associated with this company.
   */
  @OneToMany(() => ContractItem, (x) => x.company)
  contracts = new Collection<ContractItem>(this);

  // System fields

  /**
   * Date and time when the company was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the company was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
