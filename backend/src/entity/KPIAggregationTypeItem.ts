import { Entity, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import { KPIItem } from './KPIItem';

/**
 * Entity representing a KPI Aggregation Type (e.g., COUNT, SUM, AVG, MIN, MAX)
 */
@Entity()
export class KPIAggregationTypeItem {
  @PrimaryKey({ autoincrement: false })
  handle!: string;

  @OneToMany(() => KPIItem, kpi => kpi.aggregation)
  kpis = new Collection<KPIItem>(this);
}
