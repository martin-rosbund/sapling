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
 * @class KpiTypeItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a KPI Type.
 * @description Used to define KPI types for date comparison (e.g., ITEM, EVENT, TASK).
 *
 * @property {string} handle - Unique identifier for the KPI type (primary key).
 * @property {Collection<KpiItem>} kpis - KPIs using this type.
 * @property {Date} createdAt - Date and time when the KPI type item was created.
 * @property {Date} updatedAt - Date and time when the KPI type item was last updated.
 */
@Entity()
export class KpiTypeItem {
  //#region Properties: Persisted
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @PrimaryKey({ length: 64 })
  handle!: string;
  //#endregion

  //#region Properties: Relation
  @ApiProperty({ type: () => KpiItem, isArray: true })
  @OneToMany(() => KpiItem, (x) => x.type)
  kpis: Collection<KpiItem> = new Collection<KpiItem>(this);
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
