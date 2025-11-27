import {
  Entity,
  PrimaryKey,
  Property,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { ContractItem } from './ContractItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

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
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title of the product.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: false })
  title: string;

  /**
   * Name of the product.
   */
  @ApiProperty()
  @Property({ length: 64, nullable: false })
  name: string;

  /**
   * Version of the product (default: 1.0.0).
   */
  @ApiPropertyOptional()
  @Property({ default: '1.0.0', nullable: true, length: 32 })
  version?: string | null;

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
  contracts = new Collection<ContractItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the product was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the product was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
