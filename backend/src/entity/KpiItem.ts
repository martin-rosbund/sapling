import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { EntityItem } from './EntityItem';
import { DashboardItem } from './DashboardItem';
import { KpiAggregationItem } from './KpiAggregationItem';
import { KpiTypeItem } from './KpiTypeItem';
import { KpiTimeframeItem } from './KpiTimeframeItem';
import { DashboardTemplateItem } from './DashboardTemplateItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { type Rel } from '@mikro-orm/core';

/**
 * @class KpiItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a Key Performance Indicator (KPI).
 * @description Contains KPI configuration, aggregation, and relations to entities. Used to define, aggregate, and display KPIs across dashboards and entities.
 *
 * @property {number} handle - Unique identifier for the KPI (primary key).
 * @property {string} name - Name of the KPI.
 * @property {string} [description] - Description of the KPI (optional).
 * @property {KpiAggregationItem} aggregation - Aggregation type (relation to KpiAggregationItem).
 * @property {string} field - Field to aggregate (e.g., "status", "priority", "product").
 * @property {KpiTypeItem} type - Field to use for date comparison (relation to KpiTypeItem).
 * @property {string} [timeframeField] - Field to use for date comparison (optional).
 * @property {KpiTimeframeItem} [timeframe] - Type of date comparison (relation to KpiTimeframeItem).
 * @property {KpiTimeframeItem} [timeframeInterval] - Interval type for date comparison (relation to KpiTimeframeItem).
 * @property {object} [filter] - Optional filter for the KPI (JSON object).
 * @property {string[]} [groupBy] - Optional group by fields for the KPI (array of strings).
 * @property {string} [relationField] - Relation field to aggregate (optional).
 * @property {EntityItem} [relation] - Optional relation to include (relation to EntityItem).
 * @property {EntityItem} targetEntity - The entity this KPI targets (relation to EntityItem).
 * @property {Collection<DashboardItem>} dashboards - Dashboards this KPI is associated with.
 * @property {Date} createdAt - Date and time when the KPI was created.
 * @property {Date} updatedAt - Date and time when the KPI was last updated.
 */
@Entity()
export class KpiItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the KPI (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Name of the KPI.
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'kpi.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  /**
   * Description of the KPI (optional).
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'kpi.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 256, nullable: true })
  description?: string;

  /**
   * Aggregation type (relation to KpiAggregationItem)
   */
  @ApiProperty({ type: () => KpiAggregationItem })
  @SaplingForm({
    order: 100,
    group: 'kpi.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => KpiAggregationItem, { nullable: false })
  aggregation!: KpiAggregationItem;

  /**
   * Field to aggregate (e.g., "status", "priority", "product").
   */
  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'kpi.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  field!: string;

  /**
   * Field to use for date comparison (e.g., "createdAt", "updatedAt").
   */
  @ApiProperty({ type: () => KpiTypeItem })
  @SaplingForm({
    order: 200,
    group: 'kpi.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => KpiTypeItem, { nullable: false, default: 'ITEM' })
  type!: KpiTypeItem;

  /**
   * Field to use for date comparison (e.g., "createdAt", "updatedAt").
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'kpi.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  timeframeField?: string;

  /**
   * Type of date comparison (relation to KpiTimeframeItem)
   */
  @ApiPropertyOptional({ type: () => KpiTimeframeItem })
  @SaplingForm({
    order: 300,
    group: 'kpi.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => KpiTimeframeItem, { nullable: true })
  timeframe?: KpiTimeframeItem;

  /**
   * Type of date comparison (relation to KpiTimeframeItem)
   */
  @ApiPropertyOptional({ type: () => KpiTimeframeItem })
  @SaplingForm({
    order: 400,
    group: 'kpi.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => KpiTimeframeItem, { nullable: true })
  timeframeInterval?: KpiTimeframeItem;

  /**
   * Optional filter for the KPI (JSON object).
   */
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @SaplingForm({
    order: 200,
    group: 'kpi.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ type: 'json', nullable: true })
  filter?: object;

  /**
   * Optional group by fields for the KPI (array of strings).
   */
  @ApiPropertyOptional({ type: 'array', items: { type: 'string' } })
  @SaplingForm({
    order: 400,
    group: 'kpi.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ type: 'json', nullable: true })
  groupBy?: string[];

  /**
   * Relationfield to aggregate (e.g., "status", "priority", "product").
   */
  @ApiProperty()
  @SaplingForm({
    order: 500,
    group: 'kpi.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  relationField?: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Optional relations to include (array of strings).
   */
  @ApiPropertyOptional({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 500,
    group: 'kpi.groupReference',
    groupOrder: 300,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: true })
  relation?: Rel<EntityItem>;
  /**
   * The entity this KPI targets (optional).
   */
  @ApiPropertyOptional({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 600,
    group: 'kpi.groupReference',
    groupOrder: 300,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: true })
  targetEntity!: Rel<EntityItem>;

  /**
   * Dashboards this KPI is associated with.
   */
  @ApiProperty({ type: [DashboardItem] })
  @ManyToMany(() => DashboardItem, (x) => x.kpis)
  dashboards: Collection<DashboardItem> = new Collection<DashboardItem>(this);

  /**
   * Dashboard templates this KPI is associated with.
   */
  @ApiPropertyOptional({ type: [DashboardTemplateItem] })
  @ManyToMany(() => DashboardTemplateItem, (x) => x.kpis)
  dashboardTemplates: Collection<DashboardTemplateItem> =
    new Collection<DashboardTemplateItem>(this);
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
