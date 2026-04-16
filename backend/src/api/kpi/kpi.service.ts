// KpiService: Service for executing KPI queries and returning results
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { SqlEntityManager } from '@mikro-orm/sql';
import { KpiItem } from '../../entity/KpiItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { KPIExecutor } from './kpi.executor';
import { TrendResultDto } from './dto/trend-result.dto';
import { SparklineMonthPointDto } from './dto/sparkline-month-point.dto';
import { SparklineDayPointDto } from './dto/sparkline-day-point.dto';

/**
 * @class KpiService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service providing KPI query execution and result aggregation.
 *
 * @property        {EntityManager} em Entity manager for database access
 */
@Injectable()
export class KpiService {
  /**
   * Creates an instance of KpiService.
   * @param {EntityManager} em Entity manager for database access
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Executes a KPI by its ID, performing the configured aggregation and returning the result.
   * Handles all supported KPI types (ITEM, LIST, TREND, SPARKLINE).
   * @param {number} id The KPI handle (ID)
   * @returns {Promise<{kpi: KpiItem, value: number | object | TrendResultDto | SparklineMonthPointDto[] | SparklineDayPointDto[] | null}>} The KPI entity and the computed value
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
    const kpi = await this.em.findOne(
      KpiItem,
      { handle: id },
      { populate: ['relation'] },
    );
    if (!kpi) throw new NotFoundException(`global.notFound`);
    // Resolve target entity class from registry
    const entityClass = ENTITY_MAP[kpi.targetEntity?.handle || ''] as unknown;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    // Instantiate executor for this KPI
    const executor = new KPIExecutor(this.em as SqlEntityManager, kpi);
    const type = kpi.type?.handle || 'ITEM';
    const groupBy = kpi.groupBy;
    const baseWhere = kpi.filter || {};
    let value:
      | number
      | object
      | TrendResultDto
      | SparklineMonthPointDto[]
      | SparklineDayPointDto[]
      | null;
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
