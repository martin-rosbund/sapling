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
import { KPIAggregationTypeItem } from './KPIAggregationTypeItem';
import { KPIDateComparisonTypeItem } from './KPIDateComparisonTypeItem';

/**
 * Entity representing a Key Performance Indicator (KPI).
 * Contains KPI configuration, aggregation, and relations to entities.
 */
@Entity()
export class KPIItem {
  /**
   * Unique identifier for the KPI (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Name of the KPI.
   */
  @Property({ length: 128, nullable: false })
  name!: string;

  /**
   * Description of the KPI (optional).
   */
  @Property({ length: 256, nullable: true })
  description?: string;

  /**
   * Aggregation type (relation to KPIAggregationTypeItem)
   */
  @ManyToOne(() => KPIAggregationTypeItem, { nullable: false })
  aggregation!: KPIAggregationTypeItem;

  /**
   * Field to aggregate (e.g., "status", "priority", "product").
   */
  @Property({ length: 128, nullable: false })
  field!: string;

  /**
   * Field to use for date comparison (e.g., "createdAt", "updatedAt").
   */
  @Property({ length: 128, nullable: true })
  dateComparisonField?: string | null;

  /**
   * Type of date comparison (relation to KPIDateComparisonTypeItem)
   */
  @ManyToOne(() => KPIDateComparisonTypeItem, { nullable: true })
  dateComparison?: KPIDateComparisonTypeItem | null;

  /**
   * Optional filter for the KPI (JSON object).
   */
  @Property({ type: 'json', nullable: true })
  filter?: object;

  /**
   * Optional group by fields for the KPI (array of strings).
   */
  @Property({ type: 'json', nullable: true })
  groupBy?: string[];

  // Relations

  /**
   * The entity this KPI targets (optional).
   */
  @ManyToOne(() => EntityItem, { nullable: true })
  targetEntity!: EntityItem | null;

  /**
   * Dashboards this KPI is associated with.
   */
  @ManyToMany(() => DashboardItem, (x) => x.kpis)
  dashboards = new Collection<DashboardItem>(this);

  // System fields

  /**
   * Date and time when the KPI was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the KPI was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
