import { Entity, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import { KPIItem } from './KPIItem';

/**
 * Entity representing a KPI Date Comparison Type (e.g., YEAR, QUARTER, MONTH, WEEK, DAY)
 */
@Entity()
export class KPITypeItem {
  @PrimaryKey({ autoincrement: false })
  handle!: string;

  @OneToMany(() => KPIItem, kpi => kpi.type)
  kpis = new Collection<KPIItem>(this);
}
