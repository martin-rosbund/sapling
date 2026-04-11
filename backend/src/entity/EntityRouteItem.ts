import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { EntityItem } from './EntityItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a route associated with an entity, including persisted properties, relations, and system fields.
 *
 * @property        {number}            handle      Unique identifier for the entity route (primary key)
 * @property        {string}            route       Route string associated with the entity
 * @property        {string}            navigation  Navigation string (optional)
 * @property        {string}            hint        Short hint shown in the navigation (optional)
 * @property        {EntityItem}        entity      The entity this route belongs to (optional)
 * @property        {Date}              createdAt   Date and time when the entity route was created
 * @property        {Date}              updatedAt   Date and time when the entity route was last updated
 */
@Entity()
export class EntityRouteItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the entity route (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Route string associated with the entity.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  route!: string;

  /**
   * Navigation string (optional).
   * @type {string}
   */
  @ApiProperty()
  @Property({ length: 128, nullable: true })
  navigation?: string;

  /**
   * Short hint shown in the navigation (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  hint?: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The entity this route belongs to (optional).
   * @type {EntityItem}
   */
  @ApiPropertyOptional({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem, { nullable: true })
  entity!: Rel<EntityItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the entity route was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the entity route was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
