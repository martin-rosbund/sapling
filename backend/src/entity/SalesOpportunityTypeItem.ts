import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { SalesOpportunityItem } from './SalesOpportunityItem';

/**
 * Entity representing a sales opportunity type.
 * Used to categorize sales opportunities.
 */
@Entity()
export class SalesOpportunityTypeItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the event type (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Title or name of the event type.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the event type (default: mdi-calendar).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color used for displaying the event type (default: #4CAF50).
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Sales opportunities associated with this sales opportunity type.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem, isArray: true })
  @OneToMany(() => SalesOpportunityItem, (x) => x.type)
  salesOpportunities = new Collection<SalesOpportunityItem>(this);
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
