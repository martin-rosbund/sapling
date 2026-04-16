import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { ServerLandscapeItem } from './ServerLandscapeItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a server landscape type, including persisted properties, relations, and system fields.
 *
 * @property        {string}                           handle              Unique identifier for the server type (primary key)
 * @property        {string}                           title               Display title of the server type
 * @property        {string}                           icon                Icon representing the server type
 * @property        {string}                           color               Color used for displaying the server type
 * @property        {Collection<ServerLandscapeItem>} serverLandscapes    Server landscape items using this type
 * @property        {Date}                             createdAt           Date and time when the type was created
 * @property        {Date}                             updatedAt           Date and time when the type was last updated
 */
@Entity()
export class ServerLandscapeTypeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the server type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Display title of the server type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the server type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-server', length: 64, nullable: false })
  icon?: string = 'mdi-server';

  /**
   * Color used for displaying the server type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#1565C0', length: 32, nullable: false })
  color: string = '#1565C0';
  // #endregion

  // #region Properties: Relation
  /**
   * Server landscape items using this type.
   * @type {Collection<ServerLandscapeItem>}
   */
  @ApiPropertyOptional({ type: () => ServerLandscapeItem, isArray: true })
  @OneToMany(
    () => ServerLandscapeItem,
    (serverLandscape) => serverLandscape.type,
  )
  serverLandscapes: Collection<ServerLandscapeItem> =
    new Collection<ServerLandscapeItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
