import { raw, type RawQueryFragment } from '@mikro-orm/core';
import type { SqlEntityManager } from '@mikro-orm/sql';
import { KpiItem } from '../../entity/KpiItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TrendResultDto } from './dto/trend-result.dto';
import { SparklineMonthPointDto } from './dto/sparkline-month-point.dto';
import { SparklineDayPointDto } from './dto/sparkline-day-point.dto';
import { SparklineWeekPointDto } from './dto/sparkline-week-point.dto';
import { KpiDrilldownDto, KpiDrilldownEntryDto } from './dto/kpi-drilldown.dto';

type KpiAggregateValue =
  | number
  | object
  | Array<Record<string, unknown>>
  | null;

type KpiWhere = Record<string, unknown>;

type SparklinePointDto =
  | SparklineMonthPointDto
  | SparklineDayPointDto
  | SparklineWeekPointDto;

type SparklineBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  createPoint: (value: number | object | null) => SparklinePointDto;
};

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

  private toColumnName(fieldPath: string): string {
    return fieldPath.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  }

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
    const meta = this.em.getMetadata().get(entityClass);
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
      const propertyMeta = meta.properties[fieldPath];

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
        const expression = `e.${this.toColumnName(fieldPath)}_handle`;

        return {
          expression,
          groupBy: expression,
          select: raw<RawQueryFragment>(
            `${expression} as ${alias || fieldPath}`,
          ),
        };
      }

      if (
        propertyMeta &&
        ['m:1', '1:1'].includes(propertyMeta.kind ?? '') &&
        propertyMeta.fieldNames?.[0]
      ) {
        const expression = `e.${propertyMeta.fieldNames[0]}`;

        return {
          expression,
          groupBy: expression,
          select: raw<RawQueryFragment>(
            `${expression} as ${alias || fieldPath}`,
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

  private normalizeWhere(where: object): KpiWhere {
    if (where && typeof where === 'object' && !Array.isArray(where)) {
      return { ...(where as KpiWhere) };
    }

    return {};
  }

  private hasWhere(where: KpiWhere): boolean {
    return Object.keys(where).length > 0;
  }

  private combineWhere(baseWhere: object, extraWhere: KpiWhere): KpiWhere {
    const normalizedBase = this.normalizeWhere(baseWhere);

    if (!this.hasWhere(extraWhere)) {
      return normalizedBase;
    }

    if (!this.hasWhere(normalizedBase)) {
      return { ...extraWhere };
    }

    return {
      $and: [normalizedBase, extraWhere],
    };
  }

  private getTargetEntityHandle(): string | null {
    const handle = this.kpi.targetEntity?.handle;

    return typeof handle === 'string' && handle.length > 0 ? handle : null;
  }

  private formatDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    return `${day}.${month}.${date.getFullYear()}`;
  }

  private createDrilldownEntry(
    key: string,
    label: string,
    filter: KpiWhere,
    value?: KpiAggregateValue,
  ): KpiDrilldownEntryDto {
    const entry = new KpiDrilldownEntryDto();
    entry.key = key;
    entry.label = label;
    entry.filter = filter;
    entry.value = value;
    return entry;
  }

  buildBaseDrilldown(baseWhere: object): KpiDrilldownDto | null {
    const entityHandle = this.getTargetEntityHandle();

    if (!entityHandle) {
      return null;
    }

    const drilldown = new KpiDrilldownDto();
    drilldown.entityHandle = entityHandle;
    drilldown.baseFilter = this.normalizeWhere(baseWhere);
    return drilldown;
  }

  buildTrendDrilldown(
    baseWhere: object,
    trend: TrendResultDto | null,
  ): KpiDrilldownDto | null {
    const drilldown = this.buildBaseDrilldown(baseWhere);
    const timeframe = this.kpi.timeframe?.handle;
    const timeframeField = this.kpi.timeframeField || 'created_at';
    const now = new Date();
    const rangeCurrent = this.getTimeRange(timeframe, now);
    const rangePrevious = this.getPreviousTimeRange(timeframe, now);

    if (!drilldown) {
      return null;
    }

    if (rangeCurrent) {
      drilldown.current = this.createDrilldownEntry(
        'current',
        `${this.formatDate(rangeCurrent.start)} - ${this.formatDate(rangeCurrent.end)}`,
        this.combineWhere(baseWhere, {
          [timeframeField]: {
            $gte: rangeCurrent.start,
            $lte: rangeCurrent.end,
          },
        }),
        trend?.current ?? null,
      );
    }

    if (rangePrevious) {
      drilldown.previous = this.createDrilldownEntry(
        'previous',
        `${this.formatDate(rangePrevious.start)} - ${this.formatDate(rangePrevious.end)}`,
        this.combineWhere(baseWhere, {
          [timeframeField]: {
            $gte: rangePrevious.start,
            $lte: rangePrevious.end,
          },
        }),
        trend?.previous ?? null,
      );
    }

    return drilldown;
  }

  buildSparklineDrilldown(
    baseWhere: object,
    points: SparklinePointDto[] = [],
  ): KpiDrilldownDto | null {
    const drilldown = this.buildBaseDrilldown(baseWhere);
    const timeframe = this.kpi.timeframe?.handle;
    const interval = this.kpi.timeframeInterval?.handle;
    const timeframeField = this.kpi.timeframeField || 'created_at';
    const buckets = this.getSparklineBuckets(timeframe, interval, new Date());

    if (!drilldown) {
      return null;
    }

    drilldown.items = buckets.map((bucket, index) =>
      this.createDrilldownEntry(
        bucket.key,
        bucket.label,
        this.combineWhere(baseWhere, {
          [timeframeField]: {
            $gte: bucket.start,
            $lte: bucket.end,
          },
        }),
        (points[index]?.value as KpiAggregateValue | undefined) ?? null,
      ),
    );

    return drilldown;
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
  ): Promise<KpiAggregateValue> {
    return (await this.aggregate(baseWhere, groupBy)) as KpiAggregateValue;
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
    const rangeCurrent = this.getTimeRange(timeframe, now);
    const rangePrev = this.getPreviousTimeRange(timeframe, now);
    const currentWhere = rangeCurrent
      ? this.combineWhere(baseWhere, {
          [timeframeField]: {
            $gte: rangeCurrent.start,
            $lte: rangeCurrent.end,
          },
        })
      : this.normalizeWhere(baseWhere);
    const previousWhere = rangePrev
      ? this.combineWhere(baseWhere, {
          [timeframeField]: {
            $gte: rangePrev.start,
            $lte: rangePrev.end,
          },
        })
      : this.normalizeWhere(baseWhere);

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
    const buckets = this.getSparklineBuckets(timeframe, interval, new Date());
    const points: SparklinePointDto[] = [];

    for (const bucket of buckets) {
      const where = this.combineWhere(baseWhere, {
        [timeframeField]: {
          $gte: bucket.start,
          $lte: bucket.end,
        },
      });
      const value = await this.aggregate(where, groupBy);
      points.push(bucket.createPoint(value as number | object | null));
    }

    return points as
      | SparklineMonthPointDto[]
      | SparklineDayPointDto[]
      | SparklineWeekPointDto[];
  }

  private getSparklineBuckets(
    timeframe: string | undefined,
    interval: string | undefined,
    now: Date,
  ): SparklineBucket[] {
    if (timeframe === 'YEAR' && interval === 'MONTH') {
      return this.getYearMonthBuckets(now);
    }

    if (timeframe === 'MONTH' && interval === 'DAY') {
      return this.getMonthDayBuckets(now);
    }

    if (timeframe === 'MONTH' && interval === 'WEEK') {
      return this.getMonthWeekBuckets(now);
    }

    if (timeframe === 'QUARTER' && interval === 'MONTH') {
      return this.getQuarterMonthBuckets(now);
    }

    return [];
  }

  private getYearMonthBuckets(now: Date): SparklineBucket[] {
    const buckets: SparklineBucket[] = [];

    for (let i = 11; i >= 0; i--) {
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

      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth() + 1}`,
        label: `${`${start.getMonth() + 1}`.padStart(2, '0')}/${start.getFullYear()}`,
        start,
        end,
        createPoint: (value) =>
          new SparklineMonthPointDto(
            start.getMonth() + 1,
            start.getFullYear(),
            value,
          ),
      });
    }

    return buckets;
  }

  private getMonthDayBuckets(now: Date): SparklineBucket[] {
    const buckets: SparklineBucket[] = [];

    for (let i = 29; i >= 0; i--) {
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

      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
        label: this.formatDate(start),
        start,
        end,
        createPoint: (value) =>
          new SparklineDayPointDto(
            start.getDate(),
            start.getMonth() + 1,
            start.getFullYear(),
            value,
          ),
      });
    }

    return buckets;
  }

  private getMonthWeekBuckets(now: Date): SparklineBucket[] {
    const buckets: SparklineBucket[] = [];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const weekStart = new Date(firstDayOfMonth);
    let weekNumber = 1;

    while (weekStart <= lastDayOfMonth) {
      let weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      if (weekEnd > lastDayOfMonth) {
        weekEnd = new Date(lastDayOfMonth);
      }

      const currentWeekStart = new Date(weekStart);
      const currentWeekEnd = new Date(weekEnd);
      const currentWeekNumber = weekNumber;

      buckets.push({
        key: `${currentWeekStart.getFullYear()}-${currentWeekStart.getMonth() + 1}-W${currentWeekNumber}`,
        label: `W${currentWeekNumber} ${`${currentWeekStart.getMonth() + 1}`.padStart(2, '0')}/${currentWeekStart.getFullYear()}`,
        start: currentWeekStart,
        end: currentWeekEnd,
        createPoint: (value) =>
          new SparklineWeekPointDto(
            currentWeekNumber,
            currentWeekStart.getMonth() + 1,
            currentWeekStart.getFullYear(),
            value,
          ),
      });

      weekStart.setDate(weekStart.getDate() + 7);
      weekStart.setHours(0, 0, 0, 0);
      weekNumber++;
    }

    return buckets;
  }

  private getQuarterMonthBuckets(now: Date): SparklineBucket[] {
    const buckets: SparklineBucket[] = [];
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;

    for (let i = 0; i < 3; i++) {
      const start = new Date(now.getFullYear(), quarterStartMonth + i, 1);
      const end = new Date(
        now.getFullYear(),
        quarterStartMonth + i + 1,
        0,
        23,
        59,
        59,
        999,
      );

      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth() + 1}`,
        label: `${`${start.getMonth() + 1}`.padStart(2, '0')}/${start.getFullYear()}`,
        start,
        end,
        createPoint: (value) =>
          new SparklineMonthPointDto(
            start.getMonth() + 1,
            start.getFullYear(),
            value,
          ),
      });
    }

    return buckets;
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
    } else if (timeframe === 'QUARTER') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterStartMonth, 1),
        end: new Date(
          now.getFullYear(),
          quarterStartMonth + 3,
          0,
          23,
          59,
          59,
          999,
        ),
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
    } else if (timeframe === 'QUARTER') {
      const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const previousQuarterStartMonth = currentQuarterStartMonth - 3;
      const previousQuarterYear =
        previousQuarterStartMonth < 0
          ? now.getFullYear() - 1
          : now.getFullYear();
      const normalizedQuarterStartMonth =
        previousQuarterStartMonth < 0
          ? previousQuarterStartMonth + 12
          : previousQuarterStartMonth;

      return {
        start: new Date(previousQuarterYear, normalizedQuarterStartMonth, 1),
        end: new Date(
          previousQuarterYear,
          normalizedQuarterStartMonth + 3,
          0,
          23,
          59,
          59,
          999,
        ),
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
