import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';

/**
 * Entity representing a Key Performance Indicator (KPI).
 * Contains KPI configuration, aggregation, and relations to entities.
 */
@Entity()
export class KPIItem {
  /**
   * Unique identifier for the KPI (primary key).
   */
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  /**
   * Name of the KPI.
   */
  @Property({ length: 128, nullable: false })
  name!: string;

  /**
   * Description of the KPI (optional).
   */
  @Property({ length: 256, nullable: true })
  description?: string;

  /**
   * Aggregation type (e.g., "COUNT", "SUM", "AVG", "MIN", "MAX").
   */
  @Property({ default: 'COUNT', length: 32, nullable: false })
  aggregation!: string;

  /**
   * Field to aggregate (e.g., "status", "priority", "product").
   */
  @Property({ length: 128, nullable: false })
  field!: string;

  /**
   * Optional filter for the KPI (JSON object).
   */
  @Property({ type: 'json', nullable: true })
  filter?: object;

  /**
   * Optional group by fields for the KPI (array of strings).
   */
  @Property({ type: 'json', nullable: true })
  groupBy?: string[];

  // Relations

  /**
   * The entity this KPI targets (optional).
   */
  @ManyToOne(() => EntityItem, { nullable: true })
  targetEntity!: EntityItem | null;

  // System fields

  /**
   * Date and time when the KPI was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the KPI was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
