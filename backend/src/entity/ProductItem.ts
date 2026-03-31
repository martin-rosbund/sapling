import { Collection } from '@mikro-orm/core';
import { Entity, ManyToMany, Property } from '@mikro-orm/decorators/legacy';
import { ContractItem } from './ContractItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class ProductItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a product.
 * @description Contains product details and relations to contracts. Used to manage products and their associations in the system.
 *
 * @property {number} handle - Unique identifier for the product (primary key).
 * @property {string} title - Title of the product.
 * @property {string} name - Name of the product.
 * @property {string} [version] - Version of the product (default: 1.0.0).
 * @property {string} [description] - Description of the product (optional).
 * @property {Collection<ContractItem>} contracts - Contracts associated with this product.
 * @property {Date} createdAt - Date and time when the product was created.
 * @property {Date} updatedAt - Date and time when the product was last updated.
 */
@Entity()
export class ProductItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the product (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the product.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC', 'isDuplicateCheck'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Name of the product.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isDuplicateCheck'])
  @Property({ length: 64, nullable: false })
  name!: string;

  /**
   * Version of the product (default: 1.0.0).
   */
  @ApiPropertyOptional()
  @Property({ default: '1.0.0', nullable: true, length: 32 })
  version?: string = '1.0.0';

  /**
   * Description of the product (optional).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 512 })
  description?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Contracts associated with this product.
   */
  @ApiPropertyOptional({ type: () => ContractItem, isArray: true })
  @ManyToMany(() => ContractItem, (x) => x.products)
  contracts: Collection<ContractItem> = new Collection<ContractItem>(this);
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
