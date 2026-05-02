import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { CountryItem } from './CountryItem';

/**
 * @class MoneyItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a currency (Money).
 * @description Contains currency details and relations to countries. Used to manage supported currencies in the system.
 *
 * @property {string} handle - ISO 4217 currency code (primary key, e.g. 'USD').
 * @property {string} name - Name of the currency (e.g. 'US Dollar').
 * @property {string} symbol - Currency symbol (e.g. '$').
 * @property {Collection<CountryItem>} countries - Countries that use this currency as their primary currency.
 * @property {Date} createdAt - Date and time when the currency was created.
 * @property {Date} updatedAt - Date and time when the currency was last updated.
 */
@Entity()
export class MoneyItem {
  //#region Properties: Persisted
  /**
   * ISO 4217 currency code (e.g. 'USD').
   */
  @ApiProperty()
  @Property({ primary: true, length: 16 })
  handle!: string;

  /**
   * Name of the currency (e.g. 'US Dollar').
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'money.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ unique: true, length: 64, nullable: false })
  name!: string;

  /**
   * Currency symbol (e.g. '$').
   */
  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'money.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ length: 8, nullable: false })
  symbol!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Countries that use this currency as their primary currency.
   */
  @ApiPropertyOptional({ type: () => CountryItem, isArray: true })
  @OneToMany(() => CountryItem, (x) => x.money)
  countries: Collection<CountryItem> = new Collection<CountryItem>(this);
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
