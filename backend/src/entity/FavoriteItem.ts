import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { PersonItem } from './PersonItem';
import { EntityItem } from './EntityItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityRouteItem } from './EntityRouteItem';

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
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'favorite.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Optional persisted free-text search.
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 150,
    group: 'favorite.groupContent',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 150,
    tableVisible: false,
    mobileOrder: 150,
    mobileVisible: false,
  })
  @Property({ length: 256, nullable: true })
  search?: string;

  /**
   * Optional persisted sorting configuration.
   * @type {object}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 175,
    group: 'favorite.groupContent',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 175,
    tableVisible: false,
    mobileOrder: 175,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  sortBy?: object;

  /**
   * Optional query parameter (nullable).
   * @type {object}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'favorite.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  filter?: object;
  // #endregion

  // #region Properties: Relation
  /**
   * Reference to the person (not null).
   * @type {PersonItem}
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 100,
    group: 'favorite.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  /**
   * Reference to the entity (not null).
   * @type {EntityItem}
   */
  @ApiProperty({ type: () => EntityItem })
  @SaplingForm({
    order: 200,
    group: 'favorite.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  @Sapling(['isEntity'])
  entity!: Rel<EntityItem>;

  /**
   * Optional route configuration used when opening the favorite.
   * @type {EntityRouteItem}
   */
  @ApiPropertyOptional({ type: () => EntityRouteItem })
  @SaplingDependsOn({
    parentField: 'entity',
    targetField: 'entity',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 300,
    group: 'favorite.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityRouteItem, { nullable: true })
  entityRoute?: Rel<EntityRouteItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the favorite item was created.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the favorite item was last updated.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
