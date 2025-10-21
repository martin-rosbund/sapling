import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, raw } from '@mikro-orm/sqlite';
import { KPIItem } from '../../entity/KPIItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';

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

    // 3. Build query parameters
    const where = kpi.filter || {};
    const groupBy = kpi.groupBy;
    const field = kpi.field;
    const aggregation = kpi.aggregation.toUpperCase();

    // 4. Execute aggregation
    // Note: MikroORM supports aggregations only via nativeQuery or QueryBuilder
    let result;
    if (groupBy && groupBy.length > 0) {
      // Grouped aggregation
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const qb = this.em.createQueryBuilder(entityClass as any, 'e');
      groupBy.forEach((gb) => {
        qb.addSelect(`e.${gb}`);
      });
      qb.select(groupBy.map((gb) => `e.${gb}`).join(', '));
      qb.addSelect([raw(`${aggregation}(e.${field}) as value`)]);
      qb.groupBy(groupBy.map((gb) => `e.${gb}`).join(', '));
      qb.where(where);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result = await qb.execute();
    } else {
      // Simple aggregation
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const qb = this.em.createQueryBuilder(entityClass as any, 'e');
      qb.select([raw(`${aggregation}(e.${field}) as value`)]);
      qb.where(where);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result = await qb.execute();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      result = (result as any[])[0]?.value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { kpi: kpi, value: result };
  }
}
