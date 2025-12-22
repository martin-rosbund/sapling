import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { KpiItem } from './KpiItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing a Dashboard.
 * Each dashboard belongs to a person and can contain multiple KPIs.
 */
@Entity()
export class DashboardItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the dashboard (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number;

  /**
   * Name of the dashboard.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  name!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person this dashboard belongs to.
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * KPIs associated with this dashboard.
   */
  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @ManyToMany(() => KpiItem, undefined, { owner: true })
  kpis = new Collection<KpiItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
