import { Entity, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import { KpiItem } from './KpiItem';

/**
 * Entity representing a KPI Date Comparison Type (e.g., YEAR, QUARTER, MONTH, WEEK, DAY)
 */
@Entity()
export class KpiTimeframeItem {
  @PrimaryKey({ autoincrement: false })
  handle!: string;

  @OneToMany(() => KpiItem, (x) => x.timeframe)
  kpis = new Collection<KpiItem>(this);

  @OneToMany(() => KpiItem, (x) => x.timeframeInterval)
  kpisInterval = new Collection<KpiItem>(this);
}
