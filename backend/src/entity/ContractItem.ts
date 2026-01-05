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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Title of the contract.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title: string;

  /**
   * Description of the contract.
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 512 })
  description?: string;

  /**
   * Start date of the contract.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ type: 'datetime', nullable: false })
  startDate: Date;

  /**
   * End date of the contract (optional).
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ type: 'datetime', nullable: true })
  endDate?: Date;

  /**
   * Indicates if the contract is active.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  /**
   * Response time in hours (default: 24).
   */
  @ApiProperty()
  @Property({ default: 24, nullable: false })
  responseTimeHours: number = 24;
  //#endregion

  //#region Properties: Relation
  /**
   * The company associated with this contract.
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @ManyToOne(() => CompanyItem, { nullable: true })
  company?: CompanyItem;

  /**
   * Products associated with this contract.
   */
  @ApiPropertyOptional({ type: () => ProductItem, isArray: true })
  @ManyToMany(() => ProductItem)
  products = new Collection<ProductItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
