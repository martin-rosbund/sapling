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
 * Entity representing a KPI Date Comparison Type (e.g., YEAR, QUARTER, MONTH, WEEK, DAY)
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
  kpis = new Collection<KpiItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the KPI was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the KPI was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
