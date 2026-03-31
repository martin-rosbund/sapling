import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { KpiItem } from './KpiItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a KPI Aggregation Type (e.g., COUNT, SUM, AVG, MIN, MAX), including persisted properties, relations, and system fields.
 *
 * @property        {string}                    handle      Unique identifier for the KPI aggregation type (primary key)
 * @property        {Collection<KpiItem>}       kpis        KPIs associated with this aggregation type
 * @property        {Date}                      createdAt   Date and time when the aggregation type was created
 * @property        {Date}                      updatedAt   Date and time when the aggregation type was last updated
 */
@Entity()
export class KpiAggregationItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the KPI aggregation type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * KPIs associated with this aggregation type.
   * @type {Collection<KpiItem>}
   */
  @ApiProperty({ type: () => KpiItem, isArray: true })
  @OneToMany(() => KpiItem, (x) => x.aggregation)
  kpis: Collection<KpiItem> = new Collection<KpiItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the aggregation type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the aggregation type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
