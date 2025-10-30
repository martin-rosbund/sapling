import { Entity, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import { KpiItem } from './KpiItem';

/**
 * Entity representing a KPI Date Comparison Type (e.g., YEAR, QUARTER, MONTH, WEEK, DAY)
 */
@Entity()
export class KpiTypeItem {
  @PrimaryKey({ autoincrement: false })
  handle!: string;

  @OneToMany(() => KpiItem, (x) => x.type)
  kpis = new Collection<KpiItem>(this);
}
