import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ServerLandscapeTypeItem } from './ServerLandscapeTypeItem';
import { ServerLandscapeTypeUsageItem } from './ServerLandscapeTypeUsageItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a server landscape item, including persisted properties, relations, and system fields.
 *
 * @property        {number}                    handle              Unique identifier for the server landscape item (primary key)
 * @property        {string}                    serverName          Server name
 * @property        {string}                    description         Description of the server landscape item
 * @property        {boolean}                   allowRemoteAccess   Indicates if remote access is possible
 * @property        {boolean}                   hasInternetAccess   Indicates if internet access is available
 * @property        {ServerLandscapeTypeItem}   type                The server type assigned to this item
 * @property        {ServerLandscapeTypeUsageItem} usage            The usage assigned to this item
 * @property        {CompanyItem}               company             The company associated with this server landscape item
 * @property        {Date}                      createdAt           Date and time when the item was created
 * @property        {Date}                      updatedAt           Date and time when the item was last updated
 */
@Entity()
export class ServerLandscapeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the server landscape item (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Server name.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'serverLandscape.groupIntegration',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  serverName!: string;

  /**
   * Description of the server landscape item.
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'serverLandscape.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 512, nullable: true })
  description?: string;

  /**
   * Indicates if remote access is possible.
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'serverLandscape.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  allowRemoteAccess: boolean = false;

  /**
   * Indicates if internet access is available.
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'serverLandscape.groupConfiguration',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  hasInternetAccess: boolean = true;
  // #endregion

  // #region Properties: Relation
  /**
   * The server type assigned to this item.
   * @type {ServerLandscapeTypeItem}
   */
  @ApiPropertyOptional({ type: () => ServerLandscapeTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'serverLandscape.groupReference',
    groupOrder: 400,
    width: 1,
  })
  @ManyToOne(() => ServerLandscapeTypeItem, { nullable: false })
  type!: Rel<ServerLandscapeTypeItem>;

  /**
   * The usage assigned to this item.
   * @type {ServerLandscapeTypeUsageItem}
   */
  @ApiPropertyOptional({ type: () => ServerLandscapeTypeUsageItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'serverLandscape.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => ServerLandscapeTypeUsageItem, { nullable: false })
  usage!: Rel<ServerLandscapeTypeUsageItem>;

  /**
   * The company associated with this server landscape item.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @SaplingForm({
    order: 300,
    group: 'serverLandscape.groupReference',
    groupOrder: 400,
    width: 2,
  })
  @ManyToOne(() => CompanyItem, { nullable: false })
  company!: Rel<CompanyItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the item was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the item was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
