import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a seed script execution record, including persisted properties and system fields.
 *
 * @property        {number}    handle        Unique identifier for the seed script item (primary key)
 * @property        {string}    scriptName    Name of the executed seed script
 * @property        {string}    entityHandle    Name of the entity affected by the seed script
 * @property        {Date}      executedAt    Date and time when the seed script was executed
 * @property        {boolean}   isSuccess     Indicates whether the seed script execution was successful
 * @property        {Date}      createdAt     Date and time when the seed script item was created
 * @property        {Date}      updatedAt     Date and time when the seed script item was last updated
 */
@Entity()
export class SeedScriptItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the seed script item (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Name of the executed seed script.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 256, nullable: false })
  scriptName!: string;

  /**
   * Name of the entity affected by the seed script.
   * @type {string}
   */
  @ApiProperty()
  @Property({ length: 64, nullable: false })
  entityHandle!: string;

  /**
   * Date and time when the seed script was executed.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  executedAt!: Date;

  /**
   * Indicates whether the seed script execution was successful.
   * Used to track the status and identify any issues.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isSuccess!: boolean;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the seed script item was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the seed script item was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
