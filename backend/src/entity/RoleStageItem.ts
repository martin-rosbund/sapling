import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { RoleItem } from './RoleItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class RoleStageItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a stage for user roles.
 * @description Used to group or categorize roles by stage. Contains stage details and relations to roles.
 *
 * @property {string} handle - Unique identifier for the role stage (primary key).
 * @property {string} title - Title or name of the role stage.
 * @property {Collection<RoleItem>} roles - Roles that belong to this stage.
 * @property {Date} createdAt - Date and time when the role stage was created.
 * @property {Date} updatedAt - Date and time when the role stage was last updated.
 */
@Entity()
export class RoleStageItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the role stage (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Title or name of the role stage.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  title: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Roles that belong to this stage.
   */
  @ApiPropertyOptional({ type: () => RoleItem, isArray: true })
  @OneToMany(() => RoleItem, (x) => x.stage)
  roles: Collection<RoleItem> = new Collection<RoleItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
