import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressItem } from './AddressItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing an address type, including persisted properties, relations, and system fields.
 *
 * @property        {string}                    handle      Unique identifier for the address type (primary key)
 * @property        {string}                    title       Title or name of the address type
 * @property        {string}                    icon        Icon representing the address type
 * @property        {string}                    color       Color used for displaying the address type
 * @property        {Collection<AddressItem>}   addresses   Addresses assigned to this type
 * @property        {Date}                      createdAt   Date and time when the address type was created
 * @property        {Date}                      updatedAt   Date and time when the address type was last updated
 */
@Entity()
export class AddressTypeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the address type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Title or name of the address type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'addressType.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the address type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 200,
    group: 'addressType.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: 'mdi-map-marker-outline', length: 64, nullable: false })
  icon?: string = 'mdi-map-marker-outline';

  /**
   * Color used for displaying the address type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 300,
    group: 'addressType.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Addresses assigned to this type.
   * @type {Collection<AddressItem>}
   */
  @ApiPropertyOptional({ type: () => AddressItem, isArray: true })
  @OneToMany(() => AddressItem, (address) => address.type)
  addresses: Collection<AddressItem> = new Collection<AddressItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the address type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the address type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
