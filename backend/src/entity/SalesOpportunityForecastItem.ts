import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { SalesOpportunityItem } from './SalesOpportunityItem';

/**
 * @class SalesOpportunityForecastItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a sales opportunity forecast type.
 * @description Used to categorize sales opportunities. Contains forecast details and relations to sales opportunities.
 *
 * @property {string} handle - Unique identifier for the forecast type (primary key).
 * @property {string} title - Title or name of the forecast type.
 * @property {string} [icon] - Icon representing the forecast type (default: mdi-calendar).
 * @property {string} color - Color used for displaying the forecast type (default: #4CAF50).
 * @property {Collection<SalesOpportunityItem>} salesOpportunities - Sales opportunities associated with this forecast type.
 * @property {Date} createdAt - Date and time when the forecast type was created.
 * @property {Date} updatedAt - Date and time when the forecast type was last updated.
 */
@Entity()
export class SalesOpportunityForecastItem {
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
  @OneToMany(() => SalesOpportunityItem, (x) => x.forecast)
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
