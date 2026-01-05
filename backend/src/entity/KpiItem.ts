import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { DashboardItem } from './DashboardItem';
import { KpiAggregationItem } from './KpiAggregationItem';
import { KpiTypeItem } from './KpiTypeItem';
import { KpiTimeframeItem } from './KpiTimeframeItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing a Key Performance Indicator (KPI).
 * Contains KPI configuration, aggregation, and relations to entities.
 */
@Entity()
export class KpiItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the KPI (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Name of the KPI.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  name!: string;

  /**
   * Description of the KPI (optional).
   */
  @ApiPropertyOptional()
  @Property({ length: 256, nullable: true })
  description?: string;

  /**
   * Aggregation type (relation to KpiAggregationItem)
   */
  @ApiProperty({ type: () => KpiAggregationItem })
  @ManyToOne(() => KpiAggregationItem, { nullable: false })
  aggregation!: KpiAggregationItem;

  /**
   * Field to aggregate (e.g., "status", "priority", "product").
   */
  @ApiProperty()
  @Property({ length: 128, nullable: false })
  field!: string;

  /**
   * Field to use for date comparison (e.g., "createdAt", "updatedAt").
   */
  @ApiProperty({ type: () => KpiTypeItem })
  @ManyToOne(() => KpiTypeItem, { nullable: false, default: 'ITEM' })
  type!: KpiTypeItem;

  /**
   * Field to use for date comparison (e.g., "createdAt", "updatedAt").
   */
  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  timeframeField?: string;

  /**
   * Type of date comparison (relation to KpiTimeframeItem)
   */
  @ApiPropertyOptional({ type: () => KpiTimeframeItem })
  @ManyToOne(() => KpiTimeframeItem, { nullable: true })
  timeframe?: KpiTimeframeItem;

  /**
   * Type of date comparison (relation to KpiTimeframeItem)
   */
  @ApiPropertyOptional({ type: () => KpiTimeframeItem })
  @ManyToOne(() => KpiTimeframeItem, { nullable: true })
  timeframeInterval?: KpiTimeframeItem;

  /**
   * Optional filter for the KPI (JSON object).
   */
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @Property({ type: 'json', nullable: true })
  filter?: object;

  /**
   * Optional group by fields for the KPI (array of strings).
   */
  @ApiPropertyOptional({ type: 'array', items: { type: 'string' } })
  @Property({ type: 'json', nullable: true })
  groupBy?: string[];

  /**
   * Relationfield to aggregate (e.g., "status", "priority", "product").
   */
  @ApiProperty()
  @Property({ length: 128, nullable: true })
  relationField?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Optional relations to include (array of strings).
   */
  @ApiPropertyOptional({ type: () => EntityItem })
  @ManyToOne(() => EntityItem, { nullable: true })
  relation?: EntityItem;
  /**
   * The entity this KPI targets (optional).
   */
  @ApiPropertyOptional({ type: () => EntityItem })
  @ManyToOne(() => EntityItem, { nullable: true })
  targetEntity!: EntityItem;

  /**
   * Dashboards this KPI is associated with.
   */
  @ApiProperty({ type: [DashboardItem] })
  @ManyToMany(() => DashboardItem, (x) => x.kpis)
  dashboards = new Collection<DashboardItem>(this);
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
