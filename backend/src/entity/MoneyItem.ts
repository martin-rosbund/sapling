import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { CountryItem } from './CountryItem';

/**
 * Entity representing a currency (Money).
 * Contains currency details and relations to countries.
 */
@Entity()
export class MoneyItem {
  //#region Properties: Persisted
  /**
   * ISO 4217 currency code (e.g. 'USD').
   */
  @ApiProperty()
  @PrimaryKey({ length: 16 })
  handle!: string;

  /**
   * Name of the currency (e.g. 'US Dollar').
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ unique: true, length: 64, nullable: false })
  name!: string;

  /**
   * Currency symbol (e.g. '$').
   */
  @ApiProperty()
  @Property({ length: 8, nullable: false })
  symbol!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Countries that use this currency as their primary currency.
   */
  @ApiPropertyOptional({ type: () => CountryItem, isArray: true })
  @OneToMany(() => CountryItem, (x) => x.money)
  countries = new Collection<CountryItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the currency was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the currency was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
