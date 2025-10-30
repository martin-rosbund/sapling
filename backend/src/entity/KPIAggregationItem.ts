import { Entity, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import { KpiItem } from './KpiItem';

/**
 * Entity representing a KPI Aggregation Type (e.g., COUNT, SUM, AVG, MIN, MAX)
 */
@Entity()
export class KpiAggregationItem {
  @PrimaryKey({ autoincrement: false })
  handle!: string;

  @OneToMany(() => KpiItem, (x) => x.aggregation)
  kpis = new Collection<KpiItem>(this);
}
