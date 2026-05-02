import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { EntityItem } from './EntityItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a group of entities, including persisted properties, relations, and system fields.
 *
 * @property        {string}                    handle      Unique identifier for the entity group (primary key)
 * @property        {string}                    icon        Icon representing the group (default: mdi-folder)
 * @property        {boolean}                   isExpanded  Indicates if the group is expanded in the UI
 * @property        {number}                    sortOrder   Sort order used for navigation rendering
 * @property        {EntityGroupItem}           parent      Optional parent group for hierarchical navigation
 * @property        {Collection<EntityGroupItem>} children  Child groups belonging to this group
 * @property        {Collection<EntityItem>}    entities    Entities belonging to this group
 * @property        {Date}                      createdAt   Date and time when the group was created
 * @property        {Date}                      updatedAt   Date and time when the group was last updated
 */
@Entity()
export class EntityGroupItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the entity group (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Icon representing the group (default: mdi-folder).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'entityGroup.groupAppearance',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: 'mdi-folder', length: 64, nullable: false })
  icon?: string = 'mdi-folder';

  /**
   * Indicates if the group is expanded in the UI.
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'entityGroup.groupConfiguration',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: true })
  isExpanded?: boolean = true;

  /**
   * Sort order used for navigation rendering.
   * @type {number}
   */
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 200,
    group: 'entityGroup.groupConfiguration',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 0 })
  sortOrder?: number = 0;
  // #endregion

  // #region Properties: Relation
  /**
   * Optional parent group for hierarchical navigation.
   * @type {EntityGroupItem}
   */
  @ApiPropertyOptional({ type: () => EntityGroupItem })
  @SaplingForm({
    order: 100,
    group: 'entityGroup.groupReference',
    groupOrder: 300,
    width: 2,
  })
  @ManyToOne(() => EntityGroupItem, { nullable: true })
  parent?: Rel<EntityGroupItem> | null;

  /**
   * Child groups belonging to this group.
   * @type {Collection<EntityGroupItem>}
   */
  @ApiPropertyOptional({ type: () => EntityGroupItem, isArray: true })
  @OneToMany(() => EntityGroupItem, (group) => group.parent)
  children: Collection<EntityGroupItem> = new Collection<EntityGroupItem>(this);

  /**
   * Entities belonging to this group.
   * @type {Collection<EntityItem>}
   */
  @ApiPropertyOptional({ type: () => EntityItem, isArray: true })
  @OneToMany(() => EntityItem, (x) => x.group)
  entities: Collection<EntityItem> = new Collection<EntityItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the group was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the group was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
