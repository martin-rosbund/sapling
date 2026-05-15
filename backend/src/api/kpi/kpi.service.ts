// KpiService: Service for executing KPI queries and returning results
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { SqlEntityManager } from '@mikro-orm/sql';
import { KpiItem } from '../../entity/KpiItem';
import { PersonItem } from '../../entity/PersonItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { KPIExecutor } from './kpi.executor';
import { KpiResponseDto } from './dto/kpi-response.dto';
import { TrendResultDto } from './dto/trend-result.dto';
import { SparklineMonthPointDto } from './dto/sparkline-month-point.dto';
import { SparklineDayPointDto } from './dto/sparkline-day-point.dto';
import { SparklineWeekPointDto } from './dto/sparkline-week-point.dto';
import { GenericFilterService } from '../generic/generic-filter.service';
import { GenericPermissionService } from '../generic/generic-permission.service';
import { TemplateService } from '../template/template.service';

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
   */
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly genericFilterService: GenericFilterService,
    private readonly genericPermissionService: GenericPermissionService,
  ) {}

  /**
   * Executes a KPI by its ID, performing the configured aggregation and returning the result.
   * Handles all supported KPI types (ITEM, LIST, TREND, SPARKLINE).
   *
   * The KPI's persisted `filter` is first run through the same dynamic
   * placeholder resolution as generic reads (e.g. `{{currentUser.handle}}`),
   * and finally the entity-level permission filter (isPerson / isCompany /
   * isEntity) of `currentUser` is applied so KPIs respect the same data
   * scope that the generic API enforces.
   *
   * @param {number} id The KPI handle (ID)
   * @param {PersonItem | null} currentUser The user performing the query
   * @returns {Promise<KpiResponseDto>} The KPI entity and the computed value
   * @throws NotFoundException if the KPI or target entity is not found
   */
  async executeKPIById(
    id: number,
    currentUser?: PersonItem | null,
  ): Promise<KpiResponseDto> {
    // Load KPI entity by handle
    const kpi = await this.em.findOne(
      KpiItem,
      { handle: id },
      {
        populate: [
          'aggregation',
          'type',
          'timeframe',
          'timeframeInterval',
          'targetEntity',
          'relation',
        ],
      },
    );
    if (!kpi) throw new NotFoundException(`global.notFound`);
    // Resolve target entity class from registry
    const entityClass = ENTITY_MAP[kpi.targetEntity?.handle || ''] as unknown;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    const entityHandle = kpi.targetEntity?.handle ?? '';
    const template = entityHandle
      ? this.templateService.getEntityTemplate(entityHandle)
      : [];

    // Start from the persisted filter, resolve dynamic placeholders
    // ({{currentUser.handle}}, {{today.start}}, …) via the same service that
    // powers generic reads, then layer the user's entity scope on top.
    const rawFilter =
      kpi.filter && typeof kpi.filter === 'object' ? { ...kpi.filter } : {};
    const resolvedFilter = this.genericFilterService.prepareReadCriteria(
      rawFilter,
      template,
      currentUser ?? null,
    );
    const baseWhere =
      currentUser && entityHandle
        ? (this.genericPermissionService.setTopLevelFilter(
            resolvedFilter as object,
            currentUser,
            entityHandle,
          ) as Record<string, unknown>)
        : (resolvedFilter as Record<string, unknown>);
    // Instantiate executor for this KPI
    const executor = new KPIExecutor(this.em as SqlEntityManager, kpi);
    const type = kpi.type?.handle || 'ITEM';
    const groupBy = kpi.groupBy;
    let value:
      | number
      | object
      | Array<Record<string, unknown>>
      | TrendResultDto
      | SparklineMonthPointDto[]
      | SparklineDayPointDto[]
      | SparklineWeekPointDto[]
      | null;
    // Delegate to the correct executor method based on KPI type
    if (type === 'ITEM' || type === 'LIST' || type === 'BREAKDOWN') {
      value = await executor.executeItemOrList(baseWhere, groupBy);
    } else if (type === 'TREND' || type === 'COMPARISON') {
      const trend = await executor.executeTrend(baseWhere, groupBy);
      value = trend
        ? { current: trend.current, previous: trend.previous }
        : null;
    } else if (type === 'SPARKLINE') {
      value = await executor.executeSparkline(baseWhere, groupBy);
    } else {
      value = await executor.executeItemOrList(baseWhere, groupBy);
    }

    const drilldown =
      type === 'TREND' || type === 'COMPARISON'
        ? executor.buildTrendDrilldown(baseWhere, value as TrendResultDto)
        : type === 'SPARKLINE'
          ? executor.buildSparklineDrilldown(
              baseWhere,
              value as
                | SparklineMonthPointDto[]
                | SparklineDayPointDto[]
                | SparklineWeekPointDto[],
            )
          : executor.buildBaseDrilldown(baseWhere);

    // Return both the KPI entity and the computed value
    return { kpi, value, drilldown };
  }
}
