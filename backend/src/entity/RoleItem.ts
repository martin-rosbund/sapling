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
 * Entity representing a user role.
 * Contains role details and relations to persons, permissions, and stages.
 */
@Entity()
export class RoleItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the role (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Title or name of the role.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  title: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Persons assigned to this role.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem, (x) => x.roles, { cascade: [Cascade.PERSIST] })
  persons = new Collection<PersonItem>(this);

  /**
   * Permissions associated with this role.
   */
  @ApiPropertyOptional({ type: () => PermissionItem, isArray: true })
  @OneToMany(() => PermissionItem, (x) => x.role)
  permissions = new Collection<PermissionItem>(this);

  /**
   * The stage this role belongs to.
   */
  @ApiProperty({ type: () => RoleStageItem })
  @ManyToOne(() => RoleStageItem)
  stage!: RoleStageItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the role was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the role was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
