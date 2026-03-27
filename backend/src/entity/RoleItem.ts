import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  Cascade,
  OneToMany,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { PermissionItem } from './PermissionItem';
import { RoleStageItem } from './RoleStageItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class RoleItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a user role.
 * @description Contains role details and relations to persons, permissions, and stages. Used to manage user roles and their access in the system.
 *
 * @property {number} handle - Unique identifier for the role (primary key).
 * @property {string} title - Title or name of the role.
 * @property {Collection<PersonItem>} persons - Persons assigned to this role.
 * @property {Collection<PermissionItem>} permissions - Permissions associated with this role.
 * @property {RoleStageItem} stage - The stage this role belongs to.
 * @property {Date} createdAt - Date and time when the role was created.
 * @property {Date} updatedAt - Date and time when the role was last updated.
 */
@Entity()
export class RoleItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the role (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Title or name of the role.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64, nullable: false })
  title: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Persons assigned to this role.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem, (x) => x.roles, { cascade: [Cascade.PERSIST] })
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);

  /**
   * Permissions associated with this role.
   */
  @ApiPropertyOptional({ type: () => PermissionItem, isArray: true })
  @OneToMany(() => PermissionItem, (x) => x.role)
  permissions: Collection<PermissionItem> = new Collection<PermissionItem>(this);

  /**
   * The stage this role belongs to.
   */
  @ApiProperty({ type: () => RoleStageItem })
  @ManyToOne(() => RoleStageItem)
  stage!: RoleStageItem;
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
