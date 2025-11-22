import {
  Entity,
  PrimaryKey,
  OneToMany,
  Collection,
  Property,
} from '@mikro-orm/core';
import { KpiItem } from './KpiItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing a KPI Aggregation Type (e.g., COUNT, SUM, AVG, MIN, MAX)
 */
@Entity()
export class KpiAggregationItem {
  //#region Properties: Persisted
  @ApiProperty()
  @Sapling({ isShowInCompact: true })
  @PrimaryKey({ autoincrement: false })
  handle!: string;
  //#endregion

  //#region Properties: Relation
  @ApiProperty({ type: () => KpiItem, isArray: true })
  @OneToMany(() => KpiItem, (x) => x.aggregation)
  kpis = new Collection<KpiItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the KPI was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the KPI was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
