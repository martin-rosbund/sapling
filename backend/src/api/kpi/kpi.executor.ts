import { raw, type RawQueryFragment } from '@mikro-orm/core';
import type { SqlEntityManager } from '@mikro-orm/sql';
import { KpiItem } from '../../entity/KpiItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TrendResultDto } from './dto/trend-result.dto';
import { SparklineMonthPointDto } from './dto/sparkline-month-point.dto';
import { SparklineDayPointDto } from './dto/sparkline-day-point.dto';
import { SparklineWeekPointDto } from './dto/sparkline-week-point.dto';

/**
 * @class KPIExecutor
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Utility class for executing and aggregating KPI queries, including time-based analytics (trend, sparkline).
 *
 * @property        {EntityManager} em   Entity manager for database access
 * @property        {KpiItem} kpi         KPI entity containing configuration
 */
export class KPIExecutor {
  /**
   * Creates an instance of KPIExecutor.
   * @param {EntityManager} em Entity manager for database access
   * @param {KpiItem} kpi KPI entity containing configuration
   */
  constructor(
    private readonly em: SqlEntityManager,
    private readonly kpi: KpiItem,
  ) {}

  /**
   * Performs aggregation (SUM, AVG, COUNT, etc.) on the target entity, optionally grouped by fields.
   * @param {object} where Filter conditions for the query
   * @param {string[]} [groupBy] Optional array of fields to group by
   * @returns {Promise<unknown>} Aggregated value or grouped result
   */
  private async aggregate(where: object, groupBy?: string[]) {
    const field = this.kpi.field;
    const aggregation = this.kpi.aggregation.handle.toUpperCase();
    let result: unknown;
    const entityClass = ENTITY_MAP[
      this.kpi.targetEntity?.handle || ''
    ] as import('@mikro-orm/core').EntityName<any>;
    const qb = this.em.createQueryBuilder(entityClass, 'e');
    const joinAliases = new Map<string, string>();

    const ensureJoin = (relationPath: string) => {
      const existingAlias = joinAliases.get(relationPath);
      if (existingAlias) {
        return existingAlias;
      }

      const alias = joinAliases.size === 0 ? 'r' : `r${joinAliases.size + 1}`;
      qb.leftJoin(`e.${relationPath}`, alias);
      joinAliases.set(relationPath, alias);
      return alias;
    };

    let relation: string | undefined = this.kpi.relation?.handle;
    let selectField = `e.${field}`;
    let useRelation = false;

    if (field.includes('.')) {
      const [rel, relField] = field.split('.');
      relation = relation || rel;
      selectField = `${ensureJoin(relation)}.${relField}`;
      useRelation = true;
    }

    const relationHandleField = relation;
    const resolveField = (fieldPath: string, alias?: string) => {
      if (fieldPath.includes('.')) {
        const [rel, relField] = fieldPath.split('.');
        const expression = `${ensureJoin(rel)}.${relField}`;

        return {
          expression,
          groupBy: expression,
          select: alias
            ? raw<RawQueryFragment>(`${expression} as ${alias}`)
            : expression,
        };
      }

      if (fieldPath === relationHandleField && relationHandleField) {
        const expression = `e.${fieldPath}`;

        return {
          expression,
          groupBy: expression,
          select: raw<RawQueryFragment>(
            `e.${fieldPath}_handle as ${alias || fieldPath}`,
          ),
        };
      }

      const expression = `e.${fieldPath}`;

      return {
        expression,
        groupBy: expression,
        select: alias
          ? raw<RawQueryFragment>(`${expression} as ${alias}`)
          : expression,
      };
    };

    if (useRelation) {
      if (groupBy && groupBy.length > 0) {
        const primaryField = resolveField(field, 'handle');
        const selectFields: (string | RawQueryFragment)[] = [
          primaryField.select,
        ];
        const groupByFields: string[] = [primaryField.groupBy];

        groupBy.forEach((gb) => {
          const groupField = resolveField(
            gb,
            gb.includes('.') ? gb.split('.')[1] : gb,
          );

          if (groupField.expression !== primaryField.expression) {
            selectFields.push(groupField.select);
            groupByFields.push(groupField.groupBy);
          }
        });

        qb.select([
          ...selectFields,
          raw<RawQueryFragment>(`${aggregation}(${selectField}) as value`),
        ]);
        qb.groupBy(groupByFields);
        qb.where(where);
        global.log.info(qb.getQuery());
        result = await qb.execute();
      } else {
        qb.select([raw(`${aggregation}(${selectField}) as value`)]);
        qb.where(where);
        global.log.info(qb.getQuery());
        result = await qb.execute();
        result =
          Array.isArray(result) && result.length > 0 && 'value' in result[0]
            ? (result[0] as { value?: unknown }).value
            : undefined;
      }
    } else {
      if (groupBy && groupBy.length > 0) {
        const groupFields = groupBy.map((gb) =>
          resolveField(gb, gb.includes('.') ? gb.split('.')[1] : gb),
        );

        qb.select([
          ...groupFields.map((groupField) => groupField.select),
          raw<RawQueryFragment>(`${aggregation}(e.${field}) as value`),
        ]);
        qb.groupBy(groupFields.map((groupField) => groupField.groupBy));
        qb.where(where);
        global.log.info(qb.getQuery());
        result = await qb.execute();
      } else {
        qb.select([raw(`${aggregation}(e.${field}) as value`)]);
        qb.where(where);
        global.log.info(qb.getQuery());
        result = await qb.execute();
        result =
          Array.isArray(result) && result.length > 0 && 'value' in result[0]
            ? (result[0] as { value?: unknown }).value
            : undefined;
      }
    }
    return result;
  }

  /**
   * Executes a KPI of type ITEM or LIST, returning the aggregated value or grouped result.
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @returns {Promise<number | object | null>} Aggregated value or grouped result
   */
  async executeItemOrList(
    baseWhere: object,
    groupBy?: string[],
  ): Promise<number | object | null> {
    return (await this.aggregate(baseWhere, groupBy)) as number | object | null;
  }

  /**
   * Executes a KPI of type TREND, comparing current and previous time periods.
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @returns {Promise<TrendResultDto>} TrendResult with current and previous values
   */
  async executeTrend(
    baseWhere: object,
    groupBy?: string[],
  ): Promise<TrendResultDto> {
    const timeframe = this.kpi.timeframe?.handle;
    const timeframeField = this.kpi.timeframeField || 'created_at';
    const now = new Date();
    const currentWhere = { ...baseWhere };
    const previousWhere = { ...baseWhere };
    const rangeCurrent = this.getTimeRange(timeframe, now);
    const rangePrev = this.getPreviousTimeRange(timeframe, now);
    if (rangeCurrent && rangePrev) {
      currentWhere[timeframeField] = {
        $gte: rangeCurrent.start,
        $lte: rangeCurrent.end,
      };
      previousWhere[timeframeField] = {
        $gte: rangePrev.start,
        $lte: rangePrev.end,
      };
    }
    return {
      current: await this.aggregate(currentWhere, groupBy),
      previous: await this.aggregate(previousWhere, groupBy),
    } as TrendResultDto;
  }

  /**
   * Executes a KPI of type SPARKLINE, returning a time series for the configured interval.
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @returns {Promise<SparklineMonthPointDto[] | SparklineDayPointDto[] | SparklineWeekPointDto[]>} Array of sparkline data points
   */
  async executeSparkline(
    baseWhere: object,
    groupBy?: string[],
  ): Promise<
    SparklineMonthPointDto[] | SparklineDayPointDto[] | SparklineWeekPointDto[]
  > {
    const timeframe = this.kpi.timeframe?.handle;
    const interval = this.kpi.timeframeInterval?.handle;
    const timeframeField = this.kpi.timeframeField || 'created_at';
    const now = new Date();
    if (timeframe === 'YEAR' && interval === 'MONTH') {
      return await this.sparklineYearMonth(
        baseWhere,
        groupBy,
        timeframeField,
        now,
      );
    } else if (timeframe === 'MONTH' && interval === 'DAY') {
      return await this.sparklineMonthDay(
        baseWhere,
        groupBy,
        timeframeField,
        now,
      );
    } else if (timeframe === 'MONTH' && interval === 'WEEK') {
      return await this.sparklineMonthWeek(
        baseWhere,
        groupBy,
        timeframeField,
        now,
      );
    } else if (timeframe === 'QUARTER' && interval === 'MONTH') {
      return await this.sparklineQuarterMonth(
        baseWhere,
        groupBy,
        timeframeField,
        now,
      );
    }
    return [];
  }

  /**
   * Generates a monthly sparkline for the last 12 months.
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @param {string} timeframeField Timeframe field name
   * @param {Date} now Current date
   * @returns {Promise<SparklineMonthPointDto[]>} Array of monthly sparkline points
   */
  private async sparklineYearMonth(
    baseWhere: object,
    groupBy: string[] | undefined,
    timeframeField: string,
    now: Date,
  ): Promise<SparklineMonthPointDto[]> {
    const points: SparklineMonthPointDto[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: start, $lte: end };
      const val = await this.aggregate(where, groupBy);
      points.unshift({
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        value: val as number | object | null,
      });
    }
    return points;
  }

  /**
   * Generates a daily sparkline for the last 30 days.
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @param {string} timeframeField Timeframe field name
   * @param {Date} now Current date
   * @returns {Promise<SparklineDayPointDto[]>} Array of daily sparkline points
   */
  private async sparklineMonthDay(
    baseWhere: object,
    groupBy: string[] | undefined,
    timeframeField: string,
    now: Date,
  ): Promise<SparklineDayPointDto[]> {
    const points: SparklineDayPointDto[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
      );
      const start = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
      );
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: start, $lte: end };
      const val = await this.aggregate(where, groupBy);
      points.unshift({
        day: start.getDate(),
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        value: val as number | object | null,
      });
    }
    return points;
  }

  /**
   * Generates a weekly sparkline for the current month, each point representing a week.
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @param {string} timeframeField Timeframe field name
   * @param {Date} now Current date
   * @returns {Promise<SparklineWeekPointDto[]>} Array of weekly sparkline points
   */
  private async sparklineMonthWeek(
    baseWhere: object,
    groupBy: string[] | undefined,
    timeframeField: string,
    now: Date,
  ): Promise<SparklineWeekPointDto[]> {
    const points: SparklineWeekPointDto[] = [];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const weekStart = new Date(firstDayOfMonth);
    let weekNumber = 1;
    while (weekStart <= lastDayOfMonth) {
      let weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDayOfMonth) weekEnd = new Date(lastDayOfMonth);
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: weekStart, $lte: weekEnd };
      const val = await this.aggregate(where, groupBy);
      points.push({
        week: weekNumber,
        month: weekStart.getMonth() + 1,
        year: weekStart.getFullYear(),
        value: val as number | object | null,
      });
      weekStart.setDate(weekStart.getDate() + 7);
      weekNumber++;
    }
    return points;
  }

  /**
   * Generates a monthly sparkline for the current quarter (3 months).
   * @param {object} baseWhere Filter conditions
   * @param {string[]} [groupBy] Optional grouping fields
   * @param {string} timeframeField Timeframe field name
   * @param {Date} now Current date
   * @returns {Promise<SparklineMonthPointDto[]>} Array of monthly sparkline points for the quarter
   */
  private async sparklineQuarterMonth(
    baseWhere: object,
    groupBy: string[] | undefined,
    timeframeField: string,
    now: Date,
  ): Promise<SparklineMonthPointDto[]> {
    const points: SparklineMonthPointDto[] = [];
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    const quarterStartMonth = currentQuarter * 3;
    for (let i = 0; i < 3; i++) {
      const month = quarterStartMonth + i;
      const year = now.getFullYear();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: start, $lte: end };
      const val = await this.aggregate(where, groupBy);
      points.push({
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        value: val as number | object | null,
      });
    }
    return points;
  }

  /**
   * Helper: Returns start/end dates for the current time period based on timeframe type.
   * @param {string} [timeframe] Timeframe type
   * @param {Date} now Current date
   * @returns {{start: Date, end: Date} | null} Start and end dates for the current period
   */
  private getTimeRange(
    timeframe: string | undefined,
    now: Date,
  ): { start: Date; end: Date } | null {
    if (timeframe === 'MONTH') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      };
    } else if (timeframe === 'YEAR') {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    } else if (timeframe === 'WEEK') {
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      return {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek + 1,
        ),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek + 7,
          23,
          59,
          59,
          999,
        ),
      };
    } else if (timeframe === 'DAY') {
      return {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0,
        ),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        ),
      };
    }
    return null;
  }

  /**
   * Helper: Returns start/end dates for the previous time period based on timeframe type.
   * @param {string} [timeframe] Timeframe type
   * @param {Date} now Current date
   * @returns {{start: Date, end: Date} | null} Start and end dates for the previous period
   */
  private getPreviousTimeRange(
    timeframe: string | undefined,
    now: Date,
  ): { start: Date; end: Date } | null {
    if (timeframe === 'MONTH') {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    } else if (timeframe === 'YEAR') {
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    } else if (timeframe === 'WEEK') {
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      return {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek - 6,
        ),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek,
          23,
          59,
          59,
          999,
        ),
      };
    } else if (timeframe === 'DAY') {
      return {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          0,
          0,
          0,
          0,
        ),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59,
          999,
        ),
      };
    }
    return null;
  }
}
