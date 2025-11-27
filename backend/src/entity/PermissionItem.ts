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
  allowRead!: boolean | null;

  /**
   * Permission to insert new records for the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowInsert!: boolean | null;

  /**
   * Permission to update records for the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowUpdate!: boolean | null;

  /**
   * Permission to delete records for the entity.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ default: true, nullable: false })
  allowDelete!: boolean | null;

  /**
   * Permission to show the entity in the UI.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  allowShow!: boolean | null;
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
  @ManyToOne(() => RoleItem, { nullable: true, primary: true })
  role!: RoleItem | null;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the permission was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the permission was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
