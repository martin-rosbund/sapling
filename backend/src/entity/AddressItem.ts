import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyItem } from './CompanyItem';
import { AddressTypeItem } from './AddressTypeItem';
import { CountryItem } from './CountryItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a company address, including persisted properties, relations, and system fields.
 *
 * @property        {number}            handle      Unique identifier for the address (primary key)
 * @property        {string}            street      Street address
 * @property        {string}            zip         ZIP or postal code
 * @property        {string}            city        City where the address is located
 * @property        {string}            phone       Phone number for the address
 * @property        {string}            mobile      Mobile phone number for the address
 * @property        {string}            email       Email address for the address
 * @property        {string}            website     Website URL for the address
 * @property        {CompanyItem}       company     Company that owns this address
 * @property        {AddressTypeItem}   type        Type assigned to this address
 * @property        {CountryItem}       country     Country associated with this address
 * @property        {Date}              createdAt   Date and time when the address was created
 * @property        {Date}              updatedAt   Date and time when the address was last updated
 */
@Entity()
export class AddressItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the address (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  /**
   * Street address.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isNavigation'])
  @SaplingForm({ order: 100, group: 'address.groupAddress', width: 1 })
  @Property({ length: 128, nullable: false })
  street!: string;

  /**
   * ZIP or postal code.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isNavigation'])
  @SaplingForm({ order: 200, group: 'address.groupAddress', width: 1 })
  @Property({ length: 16, nullable: true })
  zip?: string;

  /**
   * City where the address is located.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isNavigation'])
  @SaplingForm({ order: 300, group: 'address.groupAddress', width: 1 })
  @Property({ length: 64, nullable: true })
  city?: string;

  /**
   * Phone number for the address.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @SaplingForm({ order: 100, group: 'address.groupContact', width: 1 })
  @Property({ length: 32, nullable: true })
  phone?: string;

  /**
   * Mobile phone number for the address.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @SaplingForm({ order: 200, group: 'address.groupContact', width: 1 })
  @Property({ length: 32, nullable: true })
  mobile?: string;

  /**
   * Email address for the address.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isMail'])
  @SaplingForm({ order: 300, group: 'address.groupContact', width: 1 })
  @Property({ length: 128, nullable: true })
  email?: string;

  /**
   * Website URL for the address.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isLink'])
  @SaplingForm({ order: 400, group: 'address.groupContact', width: 1 })
  @Property({ length: 128, nullable: true })
  website?: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Company that owns this address.
   * @type {CompanyItem}
   */
  @ApiProperty({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @SaplingForm({ order: 100, group: 'address.groupReference', width: 1 })
  @ManyToOne(() => CompanyItem, { nullable: false })
  company!: Rel<CompanyItem>;

  /**
   * Type assigned to this address.
   * @type {AddressTypeItem}
   */
  @ApiProperty({ type: () => AddressTypeItem })
  @SaplingForm({ order: 200, group: 'address.groupReference', width: 1 })
  @ManyToOne(() => AddressTypeItem, { nullable: false })
  type!: Rel<AddressTypeItem>;

  /**
   * Country associated with this address.
   * @type {CountryItem}
   */
  @ApiPropertyOptional({ type: () => CountryItem, default: 'DE' })
  @SaplingForm({ order: 400, group: 'address.groupAddress', width: 1 })
  @ManyToOne(() => CountryItem, {
    defaultRaw: `'DE'`,
    nullable: false,
  })
  country!: Rel<CountryItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the address was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the address was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
