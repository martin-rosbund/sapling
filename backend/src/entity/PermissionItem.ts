import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { RoleItem } from './RoleItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing permissions for a role on a specific entity.
 * Contains permission flags and relations to entities and roles.
 */
@Entity()
export class PermissionItem {
  //#region Properties: Persisted
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
  @ManyToOne(() => EntityItem, { primary: true })
  entity!: EntityItem;

  /**
   * Roles that have these permissions.
   */
  @ApiPropertyOptional({ type: () => RoleItem })
  @ManyToOne(() => RoleItem, { primary: true })
  role!: RoleItem;
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
