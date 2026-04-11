import { Collection } from '@mikro-orm/core';
import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { CompanyItem } from './CompanyItem';
import { AddressItem } from './AddressItem';
import { LanguageItem } from './LanguageItem';
import { MoneyItem } from './MoneyItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a country, including persisted properties, relations, and system fields.
 *
 * @property        {string}            handle      Unique identifier for the country (primary key)
 * @property        {string}            name        Name of the country
 * @property        {LanguageItem}      language    Primary language associated with this country (optional)
 * @property        {MoneyItem}         money       Primary currency associated with this country (optional)
 * @property        {Collection<CompanyItem>} companies Companies located in this country
 * @property        {Collection<AddressItem>} addresses Addresses located in this country
 * @property        {Date}              createdAt   Date and time when the country was created
 * @property        {Date}              updatedAt   Date and time when the country was last updated
 */
@Entity()
export class CountryItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the country (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Name of the country.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 256, nullable: false })
  name!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The primary language associated with this country (optional).
   * @type {LanguageItem}
   */
  @ApiPropertyOptional({ type: () => LanguageItem })
  @ManyToOne(() => LanguageItem, { defaultRaw: `'en'`, nullable: true })
  language!: Rel<LanguageItem>;

  /**
   * The primary currency associated with this country (optional).
   * @type {MoneyItem}
   */
  @ApiPropertyOptional({ type: () => MoneyItem })
  @ManyToOne(() => MoneyItem, { nullable: true })
  money?: MoneyItem;

  /**
   * Companies that are located in this country.
   * @type {Collection<CompanyItem>}
   */
  @ApiProperty({ type: () => CompanyItem, isArray: true })
  @OneToMany(() => CompanyItem, (x) => x.country)
  companies: Collection<CompanyItem> = new Collection<CompanyItem>(this);

  /**
   * Addresses that are located in this country.
   * @type {Collection<AddressItem>}
   */
  @ApiProperty({ type: () => AddressItem, isArray: true })
  @OneToMany(() => AddressItem, (x) => x.country)
  addresses: Collection<AddressItem> = new Collection<AddressItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the country was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the country was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
