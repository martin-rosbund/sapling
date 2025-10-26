import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, raw } from '@mikro-orm/sqlite';
import { KPIItem } from '../../entity/KPIItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';

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
    // 1. Load KPI entity
    const kpi = await this.em.findOne(KPIItem, { handle: id });
    if (!kpi) throw new NotFoundException(`KPI with id ${id} not found`);

    // 2. Determine target entity class
    const entityClass = ENTITY_MAP[kpi.targetEntity?.handle || ''] as unknown;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    // 3. Hilfsfunktion für Aggregation inkl. Relationen
    const aggregate = async (where: object, groupBy?: string[]) => {
      const field = kpi.field;
      const aggregation = kpi.aggregation.handle.toUpperCase();
      let result;
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
    };

    // 4. KPI Type Logik
    const type = kpi.type?.handle || 'ITEM';
    const groupBy = kpi.groupBy;
    const baseWhere = kpi.filter || {};
    const relations = kpi.relations || [];
    let value: number | object | TrendResult | SparklineMonthPoint[] | SparklineDayPoint[] | null;

    if (type === 'ITEM' || type === 'LIST') {
      // Standard: wie bisher, aber mit Relationen
      value = await aggregate(baseWhere, groupBy);
    } else if (type === 'TREND') {
      // Trend: Vergleiche aktuellen und vorherigen Zeitraum
      const timeframe = kpi.timeframe?.handle;
      const timeframeField = kpi.timeframeField || 'created_at';
      const now = new Date();
      let currentWhere = { ...baseWhere };
      let previousWhere = { ...baseWhere };

      if (timeframe === 'MONTH') {
        // Aktueller Monat
        const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
        const endCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        // Vorheriger Monat
        const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
        previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
      } else if (timeframe === 'YEAR') {
        // Aktuelles Jahr
        const startCurrent = new Date(now.getFullYear(), 0, 1);
        const endCurrent = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        // Vorheriges Jahr
        const startPrev = new Date(now.getFullYear() - 1, 0, 1);
        const endPrev = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
        previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
        } else if (timeframe === 'WEEK') {
          // Aktuelle Woche (Montag bis Sonntag)
          const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Sonntag = 7
          const startCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
          const endCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7, 23, 59, 59, 999);
          // Vorherige Woche
          const startPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 6);
          const endPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 23, 59, 59, 999);
          currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
          previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
        } else if (timeframe === 'DAY') {
          // Aktueller Tag
          const startCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const endCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          // Vorheriger Tag
          const startPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          const endPrev = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          currentWhere[timeframeField] = { $gte: startCurrent, $lte: endCurrent };
          previousWhere[timeframeField] = { $gte: startPrev, $lte: endPrev };
      }
      value = {
        current: await aggregate(currentWhere, groupBy),
        previous: await aggregate(previousWhere, groupBy),
      } as TrendResult;
    } else if (type === 'SPARKLINE') {
      // Sparkline: Zeitreihe für die letzten 12 Intervalle
      const timeframe = kpi.timeframe?.handle;
      const interval = kpi.timeframeInterval?.handle;
      const timeframeField = kpi.timeframeField || 'created_at';
      const now = new Date();
      let series: SparklineMonthPoint[] | SparklineDayPoint[] = [];
      if (timeframe === 'YEAR' && interval === 'MONTH') {
        // Letzte 12 Monate
        const points: SparklineMonthPoint[] = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(date.getFullYear(), date.getMonth(), 1);
          const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
          const where = { ...baseWhere };
          where[timeframeField] = { $gte: start, $lte: end };
          const val = await aggregate(where, groupBy);
          points.unshift({ month: start.getMonth() + 1, year: start.getFullYear(), value: val });
        }
        series = points;
      } else if (timeframe === 'MONTH' && interval === 'DAY') {
        // Letzte 30 Tage
        const points: SparklineDayPoint[] = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
          const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
          const where = { ...baseWhere };
          where[timeframeField] = { $gte: start, $lte: end };
          const val = await aggregate(where, groupBy);
          points.unshift({ day: start.getDate(), month: start.getMonth() + 1, year: start.getFullYear(), value: val });
        }
        series = points;
        } else if (timeframe === 'MONTH' && interval === 'WEEK') {
          // Wochen 1-x des aktuellen Monats
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
            const val = await aggregate(where, groupBy);
            points.push({ week: weekNumber, month: weekStart.getMonth() + 1, year: weekStart.getFullYear(), value: val });
            weekStart.setDate(weekStart.getDate() + 7);
            weekNumber++;
          }
          series = points;
        } else if (timeframe === 'QUARTER' && interval === 'MONTH') {
          // Letzte 3 Monate des aktuellen Quartals
          const points: SparklineMonthPoint[] = [];
          // Bestimme das aktuelle Quartal
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
            const val = await aggregate(where, groupBy);
            points.push({ month: start.getMonth() + 1, year: start.getFullYear(), value: val });
          }
          series = points;
      }
      // Weitere Intervalle können ergänzt werden
      value = series;
    } else {
      // Fallback: Standardverhalten
      value = await aggregate(baseWhere, groupBy);
    }

    return { kpi, value };
  }
}
