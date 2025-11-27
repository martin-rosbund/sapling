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
 * Entity representing a stage for user roles.
 * Used to group or categorize roles by stage.
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
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: false })
  title: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Roles that belong to this stage.
   */
  @ApiPropertyOptional({ type: () => RoleItem, isArray: true })
  @OneToMany(() => RoleItem, (x) => x.stage)
  roles = new Collection<RoleItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the role stage was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the role stage was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
