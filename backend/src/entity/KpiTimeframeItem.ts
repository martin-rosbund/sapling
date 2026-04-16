import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { KpiItem } from './KpiItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class KpiTimeframeItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a KPI Date Comparison Type.
 * @description Used to define date comparison types for KPIs (e.g., YEAR, QUARTER, MONTH, WEEK, DAY).
 *
 * @property {string} handle - Unique identifier for the timeframe type (primary key).
 * @property {Collection<KpiItem>} kpis - KPIs using this timeframe type.
 * @property {Collection<KpiItem>} kpisInterval - KPIs using this timeframe as an interval.
 * @property {Date} createdAt - Date and time when the timeframe item was created.
 * @property {Date} updatedAt - Date and time when the timeframe item was last updated.
 */
@Entity()
export class KpiTimeframeItem {
  //#region Properties: Persisted
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;
  //#endregion

  //#region Properties: Relation
  @ApiProperty({ type: () => KpiItem, isArray: true })
  @OneToMany(() => KpiItem, (x) => x.timeframe)
  kpis: Collection<KpiItem> = new Collection<KpiItem>(this);

  @ApiProperty({ type: () => KpiItem, isArray: true })
  @OneToMany(() => KpiItem, (x) => x.timeframeInterval)
  kpisInterval: Collection<KpiItem> = new Collection<KpiItem>(this);
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
