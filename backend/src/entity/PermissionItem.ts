import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { EntityItem } from './EntityItem';
import { RoleItem } from './RoleItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { type Rel } from '@mikro-orm/core';

/**
 * @class PermissionItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing permissions for a role on a specific entity.
 * @description Contains permission flags and relations to entities and roles. Used to manage access control for entities in the system.
 *
 * @property {boolean} allowRead - Permission to read the entity.
 * @property {boolean} allowInsert - Permission to insert new records for the entity.
 * @property {boolean} allowUpdate - Permission to update records for the entity.
 * @property {boolean} allowDelete - Permission to delete records for the entity.
 * @property {boolean} allowShow - Permission to show the entity in the UI.
 * @property {EntityItem} entity - The entity to which these permissions apply (primary relation).
 * @property {RoleItem} role - Roles that have these permissions.
 * @property {Date} createdAt - Date and time when the permission item was created.
 * @property {Date} updatedAt - Date and time when the permission item was last updated.
 */
@Entity()
@Unique({ properties: ['entity', 'role'] })
export class PermissionItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the permission (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;
  /**
   * Permission to read the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowRead?: boolean = true;

  /**
   * Permission to insert new records for the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowInsert?: boolean = true;

  /**
   * Permission to update records for the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowUpdate?: boolean = true;

  /**
   * Permission to delete records for the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowDelete?: boolean = true;

  /**
   * Permission to show the entity in the UI.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  allowShow?: boolean = true;
  //#endregion

  //#region Properties: Relation
  /**
   * The entity to which these permissions apply (primary relation).
   */
  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem)
  entity!: EntityItem;

  /**
   * Roles that have these permissions.
   */
  @ApiPropertyOptional({ type: () => RoleItem })
  @ManyToOne(() => RoleItem)
  role!: Rel<RoleItem>;
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
