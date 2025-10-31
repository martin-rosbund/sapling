import {
  Entity,
  PrimaryKey,
  Property,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { ContractItem } from './ContractItem';

/**
 * Entity representing a product.
 * Contains product details and relations to contracts.
 */
@Entity()
export class ProductItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the product (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title of the product.
   */
  @Property({ length: 128, nullable: false })
  title: string;

  /**
   * Name of the product.
   */
  @Property({ length: 64, nullable: false })
  name: string;

  /**
   * Version of the product (default: 1.0.0).
   */
  @Property({ default: '1.0.0', nullable: true, length: 32 })
  version?: string | null;

  /**
   * Description of the product (optional).
   */
  @Property({ nullable: true, length: 512 })
  description?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Contracts associated with this product.
   */
  @ManyToMany(() => ContractItem, (x) => x.products)
  contracts = new Collection<ContractItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the product was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the product was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
