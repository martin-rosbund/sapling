// KpiService: Service for executing KPI queries and returning results
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/sqlite';
import { KpiItem } from '../../entity/KpiItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { KPIExecutor } from './kpi.executor';
import { TrendResultDto } from './dto/trend-result.dto';
import { SparklineMonthPointDto } from './dto/sparkline-month-point.dto';
import { SparklineDayPointDto } from './dto/sparkline-day-point.dto';

/**
 * Injectable service for executing KPI queries and returning results.
 * Delegates all KPI logic to KPIExecutor for modularity and testability.
 */
@Injectable()
export class KpiService {
  /**
   * Injects the MikroORM EntityManager for database access.
   * @param em - EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Executes a KPI by its ID, performing the configured aggregation and returning the result.
   * Handles all supported KPI types (ITEM, LIST, TREND, SPARKLINE).
   * @param id - The KPI handle (ID)
   * @returns The KPI entity and the computed value
   * @throws NotFoundException if the KPI or target entity is not found
   */
  async executeKPIById(id: number): Promise<{
    kpi: KpiItem;
    value:
      | number
      | object
      | TrendResultDto
      | SparklineMonthPointDto[]
      | SparklineDayPointDto[]
      | null;
  }> {
    // Load KPI entity by handle
    const kpi = await this.em.findOne(KpiItem, { handle: id });
    if (!kpi) throw new NotFoundException(`global.notFound`);
    // Resolve target entity class from registry
    const entityClass = ENTITY_MAP[kpi.targetEntity?.handle || ''] as unknown;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    // Instantiate executor for this KPI
    const executor = new KPIExecutor(this.em, kpi);
    const type = kpi.type?.handle || 'ITEM';
    const groupBy = kpi.groupBy;
    const baseWhere = kpi.filter || {};
    let value:
      | number
      | object
      | TrendResultDto
      | SparklineMonthPointDto[]
      | SparklineDayPointDto[]
      | null = null;
    // Delegate to the correct executor method based on KPI type
    if (type === 'ITEM' || type === 'LIST') {
      value = await executor.executeItemOrList(baseWhere, groupBy);
    } else if (type === 'TREND') {
      const trend = await executor.executeTrend(baseWhere, groupBy);
      value = trend
        ? { current: trend.current, previous: trend.previous }
        : null;
    } else if (type === 'SPARKLINE') {
      value = await executor.executeSparkline(baseWhere, groupBy);
    } else {
      value = await executor.executeItemOrList(baseWhere, groupBy);
    }
    // Return both the KPI entity and the computed value
    return { kpi, value };
  }
}
