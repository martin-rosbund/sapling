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
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing a contract.
 * Contains contract details and relations to company and products.
 */
@Entity()
export class ContractItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the contract (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title of the contract.
   */
  @Property({ length: 128, nullable: false })
  title: string;

  /**
   * Description of the contract.
   */
  @Property({ nullable: true, length: 512 })
  description?: string;

  /**
   * Start date of the contract.
   */
  @Property({ type: 'datetime', nullable: false })
  startDate: Date;

  /**
   * End date of the contract (optional).
   */
  @Property({ type: 'datetime', nullable: true })
  endDate?: Date | null;

  /**
   * Indicates if the contract is active.
   */
  @Property({ default: true, nullable: false })
  isActive!: boolean | null;

  /**
   * Response time in hours (default: 24).
   */
  @Property({ default: 24, nullable: false })
  responseTimeHours!: number | null;
  //#endregion

  //#region Properties: Relation
  /**
   * The company associated with this contract.
   */
  @Sapling({ isCompany: true })
  @ManyToOne(() => CompanyItem)
  company!: CompanyItem;

  /**
   * Products associated with this contract.
   */
  @ManyToMany(() => ProductItem)
  products = new Collection<ProductItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the contract was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the contract was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
