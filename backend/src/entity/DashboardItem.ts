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
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Name of the dashboard.
   */
  @Property({ length: 128, nullable: false })
  name!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person this dashboard belongs to.
   */
  @Sapling({ isPerson: true })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * KPIs associated with this dashboard.
   */
  @ManyToMany(() => KpiItem, undefined, { owner: true })
  kpis = new Collection<KpiItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
