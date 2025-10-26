import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, raw } from '@mikro-orm/sqlite';
import { KPIItem } from '../../entity/KPIItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { KPIExecutor } from './kpi.executor';

// Typdefinitionen für Trend und Sparkline
export interface TrendResult {
  current: number | object | null;
  previous: number | object | null;
}

export interface SparklineMonthPoint {
  month: number;
  year: number;
  value: number | object | null;
}

export interface SparklineDayPoint {
  day: number;
  month: number;
  year: number;
  value: number | object | null;
}

// Service for executing KPIs (Key Performance Indicators)

@Injectable()
export class KpiService {
  /**
   * Injects the MikroORM EntityManager for database access.
   * @param em - EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Executes a KPI by its ID, performing the configured aggregation and returning the result.
   * @param id - The KPI handle (ID)
   * @returns The KPI entity and the computed value
   * @throws NotFoundException if the KPI or target entity is not found
   */
  async executeKPIById(id: number) {
  // Static import for TypeScript compatibility
    const kpi = await this.em.findOne(KPIItem, { handle: id });
    if (!kpi) throw new NotFoundException(`KPI with id ${id} not found`);
    const entityClass = ENTITY_MAP[kpi.targetEntity?.handle || ''] as unknown;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    const executor = new KPIExecutor(this.em, kpi);
    const type = kpi.type?.handle || 'ITEM';
    const groupBy = kpi.groupBy;
    const baseWhere = kpi.filter || {};
    let value: number | object | TrendResult | SparklineMonthPoint[] | SparklineDayPoint[] | null;
    if (type === 'ITEM' || type === 'LIST') {
      value = await executor.executeItemOrList(baseWhere, groupBy);
    } else if (type === 'TREND') {
      value = await executor.executeTrend(baseWhere, groupBy);
    } else if (type === 'SPARKLINE') {
      value = await executor.executeSparkline(baseWhere, groupBy);
    } else {
      value = await executor.executeItemOrList(baseWhere, groupBy);
    }
    return { kpi, value };
  }
}
