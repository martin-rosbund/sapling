import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { Sapling } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing an entity-scoped client script button, including dispatch metadata, relations, and system fields.
 */
@Entity()
export class ScriptButtonItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the script button (primary key, autoincrement).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Technical action name used for entity script dispatch.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  name!: string;

  /**
   * Visible title of the action button.
   * @type {string}
   */
  @ApiProperty()
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Optional JSON payload passed to the script action.
   * @type {object}
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  parameter?: object;

  /**
   * Indicates whether the button acts on multiple selected rows.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: false, nullable: false })
  isMultiSelect: boolean = false;
  // #endregion

  // #region Properties: Relation
  /**
   * The entity to which this button belongs.
   * @type {EntityItem}
   */
  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the script button was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the script button was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
