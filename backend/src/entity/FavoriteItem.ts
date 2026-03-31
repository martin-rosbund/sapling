import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { EntityItem } from './EntityItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a favorite item for a person and entity, including persisted properties, relations, and system fields.
 *
 * @property        {number}        handle      Unique identifier for the favorite item (primary key, autoincrement)
 * @property        {string}        title       Title of the favorite item (not null)
 * @property        {object}        filter      Optional query parameter (nullable)
 * @property        {PersonItem}    person      Reference to the person (not null)
 * @property        {EntityItem}    entity      Reference to the entity (not null)
 * @property        {Date}          createdAt   Date and time when the favorite item was created
 * @property        {Date}          updatedAt   Date and time when the favorite item was last updated
 */
@Entity()
export class FavoriteItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the favorite item (primary key, autoincrement).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the favorite item (not null).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Optional query parameter (nullable).
   * @type {object}
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  filter?: object;
  // #endregion

  // #region Properties: Relation
  /**
   * Reference to the person (not null).
   * @type {PersonItem}
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  /**
   * Reference to the entity (not null).
   * @type {EntityItem}
   */
  @ApiProperty({ type: () => EntityItem })
  @ManyToOne(() => EntityItem, { nullable: false })
  @Sapling(['isEntity'])
  entity!: Rel<EntityItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the favorite item was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the favorite item was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
