import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { ServerLandscapeItem } from './ServerLandscapeItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a server landscape usage type, including persisted properties, relations, and system fields.
 *
 * @property        {string}                           handle              Unique identifier for the usage type (primary key)
 * @property        {string}                           title               Display title of the usage type
 * @property        {string}                           icon                Icon representing the usage type
 * @property        {string}                           color               Color used for displaying the usage type
 * @property        {Collection<ServerLandscapeItem>} serverLandscapes    Server landscape items using this usage type
 * @property        {Date}                             createdAt           Date and time when the usage type was created
 * @property        {Date}                             updatedAt           Date and time when the usage type was last updated
 */
@Entity()
export class ServerLandscapeTypeUsageItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the usage type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Display title of the usage type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the usage type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-console-network', length: 64, nullable: false })
  icon?: string = 'mdi-console-network';

  /**
   * Color used for displaying the usage type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#2E7D32', length: 32, nullable: false })
  color: string = '#2E7D32';
  // #endregion

  // #region Properties: Relation
  /**
   * Server landscape items using this usage type.
   * @type {Collection<ServerLandscapeItem>}
   */
  @ApiPropertyOptional({ type: () => ServerLandscapeItem, isArray: true })
  @OneToMany(
    () => ServerLandscapeItem,
    (serverLandscape) => serverLandscape.usage,
  )
  serverLandscapes: Collection<ServerLandscapeItem> =
    new Collection<ServerLandscapeItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the usage type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the usage type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
