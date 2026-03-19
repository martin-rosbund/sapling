import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Represents a route associated with an entity in the system.
 * This entity is used to define the routes that belong to a specific entity,
 * allowing for better organization and management of entity-related routes.
 */
@Entity()
export class EntityRouteItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the entity route (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64 })
  route: string;

  @ApiProperty()
  @Property({ length: 128, nullable: true })
  navigation?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The entity this route belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem, { nullable: true })
  entity!: EntityItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the entity route was created.
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
