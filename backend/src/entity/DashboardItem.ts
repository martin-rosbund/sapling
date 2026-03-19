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
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a dashboard, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle      Unique identifier for the dashboard (primary key)
 * @property        {string}                name        Name of the dashboard
 * @property        {PersonItem}            person      The person this dashboard belongs to
 * @property        {Collection<KpiItem>}   kpis        KPIs associated with this dashboard
 * @property        {Date}                  createdAt   Date and time when the dashboard was created
 * @property        {Date}                  updatedAt   Date and time when the dashboard was last updated
 */
@Entity()
export class DashboardItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the dashboard (primary key).
   * @type {number}
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Name of the dashboard.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  name!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The person this dashboard belongs to.
   * @type {PersonItem}
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;

  /**
   * KPIs associated with this dashboard.
   * @type {Collection<KpiItem>}
   */
  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @ManyToMany(() => KpiItem, undefined, { owner: true })
  kpis = new Collection<KpiItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the dashboard was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
