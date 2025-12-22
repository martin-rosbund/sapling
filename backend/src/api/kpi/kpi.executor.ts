// KPIExecutor: Utility for executing KPI aggregations and time-based analytics
import { EntityManager, raw } from '@mikro-orm/sqlite';
import { KpiItem } from '../../entity/KpiItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TrendResultDto } from './dto/trend-result.dto';
import { SparklineMonthPointDto } from './dto/sparkline-month-point.dto';
import { SparklineDayPointDto } from './dto/sparkline-day-point.dto';
import { SparklineWeekPointDto } from './dto/sparkline-week-point.dto';

// DTOs werden jetzt verwendet, siehe Imports

/**
 * KPIExecutor handles the execution and aggregation of KPI queries, including time-based analytics (trend, sparkline).
 * Each KPI type is mapped to a dedicated method for clarity and extensibility.
 */
export class KPIExecutor {
  /**
   * @param em MikroORM EntityManager for database access
   * @param kpi The KPIItem entity containing configuration
   */
  constructor(
    private readonly em: EntityManager,
    private readonly kpi: KpiItem,
  ) {}

  /**
   * Performs aggregation (SUM, AVG, COUNT, etc.) on the target entity, optionally grouped by fields.
   * @param where Filter conditions for the query
   * @param groupBy Optional array of fields to group by
   * @returns Aggregated value or grouped result
   */
  private async aggregate(where: object, groupBy?: string[]) {
    // Unterstützt Felder aus referenzierten Tabellen, z.B. relation.field
    const field = this.kpi.field;
    const aggregation = this.kpi.aggregation.handle.toUpperCase();
    let result: unknown;
    const entityClass = ENTITY_MAP[
      this.kpi.targetEntity?.handle || ''
    ] as import('@mikro-orm/core').EntityName<any>;
    const qb = this.em.createQueryBuilder(entityClass, 'e');

    // Prüfe, ob das Feld ein referenziertes Feld ist (z.B. relation.field)
    let relation: string | undefined = this.kpi.relation?.handle;
    let selectField = '';
    let useRelation = false;
    if (field.includes('.')) {
      // z.B. status.description
      const [rel, relField] = field.split('.');
      relation = relation || rel;
      selectField = `r.${relField}`;
      qb.leftJoin(`e.${relation}`, 'r');
      useRelation = true;
    } else {
      selectField = `e.${field}`;
    }

    if (useRelation) {
      // Wenn relation gesetzt und Feld referenziert, dann select auf Join
      if (groupBy && groupBy.length > 0) {
        const relField = field.split('.')[1];
        // SELECT: r.<relField> as handle, ...restliche groupBy
        const selectFields = [`r.${relField} as handle`];
        const groupByFields: string[] = [`r.${relField}`];
        groupBy.forEach((gb) => {
          if (gb.includes('.')) {
            const [, gbRelField] = gb.split('.');
            if (gbRelField !== relField) {
              selectFields.push(`r.${gbRelField}`);
              groupByFields.push(`r.${gbRelField}`);
            }
          } else {
            selectFields.push(`e.${gb}`);
            groupByFields.push(`e.${gb}`);
          }
        });
        qb.select(selectFields.join(', '));
        qb.addSelect([raw(`${aggregation}(${selectField}) as value`)]);
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
      // Standard: Feld aus Haupttabelle
      if (groupBy && groupBy.length > 0) {
        groupBy.forEach((gb) => {
          qb.addSelect(`e.${gb}`);
        });
        qb.select(groupBy.map((gb) => `e.${gb}`).join(', '));
        qb.addSelect([raw(`${aggregation}(e.${field}) as value`)]);
        qb.groupBy(groupBy.map((gb) => `e.${gb}`).join(', '));
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
   * @param baseWhere Filter conditions
   * @param groupBy Optional grouping fields
   */
  async executeItemOrList(
    baseWhere: object,
    groupBy?: string[],
  ): Promise<number | object | null> {
    return (await this.aggregate(baseWhere, groupBy)) as number | object | null;
  }

  /**
   * Executes a KPI of type TREND, comparing current and previous time periods.
   * @param baseWhere Filter conditions
   * @param groupBy Optional grouping fields
   * @returns TrendResult with current and previous values
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
   * @param baseWhere Filter conditions
   * @param groupBy Optional grouping fields
   * @returns Array of sparkline data points
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
