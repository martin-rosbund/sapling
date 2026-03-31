import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ProductItem } from './ProductItem';
import { CompanyItem } from './CompanyItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a contract, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the contract (primary key)
 * @property        {string}                title               Title of the contract
 * @property        {string}                description         Description of the contract
 * @property        {Date}                  startDate           Start date of the contract
 * @property        {Date}                  endDate             End date of the contract (optional)
 * @property        {boolean}               isActive            Indicates if the contract is active
 * @property        {number}                responseTimeHours   Response time in hours (default: 24)
 * @property        {CompanyItem}           company             The company associated with this contract
 * @property        {Collection<ProductItem>} products          Products associated with this contract
 * @property        {Date}                  createdAt           Date and time when the contract was created
 * @property        {Date}                  updatedAt           Date and time when the contract was last updated
 */
@Entity()
export class ContractItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the contract (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the contract.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC', 'isDuplicateCheck'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description of the contract.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isDuplicateCheck'])
  @Property({ nullable: true, length: 512 })
  description?: string;

  /**
   * Start date of the contract.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ type: 'datetime', nullable: false })
  startDate!: Date;

  /**
   * End date of the contract (optional).
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ type: 'datetime', nullable: true })
  endDate?: Date;

  /**
   * Indicates if the contract is active.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  /**
   * Response time in hours (default: 24).
   * @type {number}
   */
  @ApiProperty()
  @Property({ default: 24, nullable: false })
  responseTimeHours: number = 24;
  // #endregion

  // #region Properties: Relation
  /**
   * The company associated with this contract.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @ManyToOne(() => CompanyItem, { nullable: true })
  company?: Rel<CompanyItem>;

  /**
   * Products associated with this contract.
   * @type {Collection<ProductItem>}
   */
  @ApiPropertyOptional({ type: () => ProductItem, isArray: true })
  @ManyToMany(() => ProductItem)
  products: Collection<ProductItem> = new Collection<ProductItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the contract was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the contract was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
