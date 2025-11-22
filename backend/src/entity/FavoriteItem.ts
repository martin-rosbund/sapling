import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { EntityItem } from './EntityItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing a favorite item for a person and entity.
 */
@Entity()
export class FavoriteItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the favorite item (primary key, autoincrement).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number;

  /**
   * Title of the favorite item (not null).
   */
  @ApiProperty()
  @Sapling({ isShowInCompact: true })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Optional query parameter (nullable).
   */
  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  filter?: object;
  //#endregion

  //#region Properties: Relation
  /**
   * Reference to the person (not null).
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling({ isPerson: true })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * Reference to the entity (not null).
   */
  @ApiProperty({ type: () => EntityItem })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: EntityItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the favorite was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the favorite was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
