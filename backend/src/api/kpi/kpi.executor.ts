import { EntityManager, raw } from '@mikro-orm/sqlite';
import { KPIItem } from '../../entity/KPIItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';

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

export class KPIExecutor {
  constructor(private readonly em: EntityManager, private readonly kpi: KPIItem) {}

  async aggregate(where: object, groupBy?: string[]) {
    const field = this.kpi.field;
    const aggregation = this.kpi.aggregation.handle.toUpperCase();
    let result;
    const entityClass = ENTITY_MAP[this.kpi.targetEntity?.handle || ''] as unknown;
    const qb = this.em.createQueryBuilder(entityClass as any, 'e');
    if (groupBy && groupBy.length > 0) {
      groupBy.forEach((gb) => {
        qb.addSelect(`e.${gb}`);
      });
      qb.select(groupBy.map((gb) => `e.${gb}`).join(', '));
      qb.addSelect([raw(`${aggregation}(${field}) as value`)]);
      qb.groupBy(groupBy.map((gb) => `e.${gb}`).join(', '));
      qb.where(where);
      result = await qb.execute();
    } else {
      qb.select([raw(`${aggregation}(e.${field}) as value`)]);
      qb.where(where);
      result = await qb.execute();
      result = (result as any[])[0]?.value;
    }
    return result;
  }

  async executeItemOrList(baseWhere: object, groupBy?: string[]) {
    return await this.aggregate(baseWhere, groupBy);
  }

  async executeTrend(baseWhere: object, groupBy?: string[]) {
    const timeframe = this.kpi.timeframe?.handle;
    const timeframeField = this.kpi.timeframeField || 'created_at';
    const now = new Date();
    let currentWhere = { ...baseWhere };
    let previousWhere = { ...baseWhere };
    if (timeframe === 'MONTH') {
      const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
      const endCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
      previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
    } else if (timeframe === 'YEAR') {
      const startCurrent = new Date(now.getFullYear(), 0, 1);
      const endCurrent = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      const startPrev = new Date(now.getFullYear() - 1, 0, 1);
      const endPrev = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
      previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
    } else if (timeframe === 'WEEK') {
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const startCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
      const endCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7, 23, 59, 59, 999);
      const startPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 6);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 23, 59, 59, 999);
      currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
      previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
    } else if (timeframe === 'DAY') {
      const startCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
      previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
    }
    return {
      current: await this.aggregate(currentWhere, groupBy),
      previous: await this.aggregate(previousWhere, groupBy),
    } as TrendResult;
  }

  async executeSparkline(baseWhere: object, groupBy?: string[]) {
    const timeframe = this.kpi.timeframe?.handle;
    const interval = this.kpi.timeframeInterval?.handle;
    const timeframeField = this.kpi.timeframeField || 'created_at';
    const now = new Date();
    if (timeframe === 'YEAR' && interval === 'MONTH') {
      return await this.sparklineYearMonth(baseWhere, groupBy, timeframeField, now);
    } else if (timeframe === 'MONTH' && interval === 'DAY') {
      return await this.sparklineMonthDay(baseWhere, groupBy, timeframeField, now);
    } else if (timeframe === 'MONTH' && interval === 'WEEK') {
      return await this.sparklineMonthWeek(baseWhere, groupBy, timeframeField, now);
    } else if (timeframe === 'QUARTER' && interval === 'MONTH') {
      return await this.sparklineQuarterMonth(baseWhere, groupBy, timeframeField, now);
    }
    return [];
  }

  async sparklineYearMonth(baseWhere: object, groupBy: string[] | undefined, timeframeField: string, now: Date) {
    const points: SparklineMonthPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: start, $lte: end };
      const val = await this.aggregate(where, groupBy);
      points.unshift({ month: start.getMonth() + 1, year: start.getFullYear(), value: val });
    }
    return points;
  }

  async sparklineMonthDay(baseWhere: object, groupBy: string[] | undefined, timeframeField: string, now: Date) {
    const points: SparklineDayPoint[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: start, $lte: end };
      const val = await this.aggregate(where, groupBy);
      points.unshift({ day: start.getDate(), month: start.getMonth() + 1, year: start.getFullYear(), value: val });
    }
    return points;
  }

  async sparklineMonthWeek(baseWhere: object, groupBy: string[] | undefined, timeframeField: string, now: Date) {
    const points: { week: number; month: number; year: number; value: number | object | null }[] = [];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let weekStart = new Date(firstDayOfMonth);
    let weekNumber = 1;
    while (weekStart <= lastDayOfMonth) {
      let weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDayOfMonth) weekEnd = new Date(lastDayOfMonth);
      const where = { ...baseWhere };
      where[timeframeField] = { $gte: weekStart, $lte: weekEnd };
      const val = await this.aggregate(where, groupBy);
      points.push({ week: weekNumber, month: weekStart.getMonth() + 1, year: weekStart.getFullYear(), value: val });
      weekStart.setDate(weekStart.getDate() + 7);
      weekNumber++;
    }
    return points;
  }

  async sparklineQuarterMonth(baseWhere: object, groupBy: string[] | undefined, timeframeField: string, now: Date) {
    const points: SparklineMonthPoint[] = [];
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
      points.push({ month: start.getMonth() + 1, year: start.getFullYear(), value: val });
    }
    return points;
  }
}
