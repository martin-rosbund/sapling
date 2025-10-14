import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/sqlite';
import { KPIItem } from '../entity/KPIItem';
import { ENTITY_MAP } from '../generic/entity-registry';

@Injectable()
export class KPIService {
  constructor(private readonly em: EntityManager) {}

  async executeKPIById(id: number) {
    // 1. KPI laden
    const kpi = await this.em.findOne(KPIItem, { handle: id });
    if (!kpi) throw new NotFoundException(`KPI with id ${id} not found`);

    // 2. Ziel-Entity bestimmen
    const entityClass = ENTITY_MAP[kpi.targetEntity?.handle || ''];
    if (!entityClass)
      throw new NotFoundException(
        `Target entity '${kpi.targetEntity}' not found`,
      );

    // 3. Query aufbauen
    const where = kpi.filter || {};
    const groupBy = kpi.groupBy;
    const field = kpi.field;
    const aggregation = kpi.aggregation.toUpperCase();

    // 4. Aggregation ausführen
    // Hinweis: MikroORM unterstützt Aggregationen nur über nativeQuery oder QueryBuilder
    let result;
    if (groupBy && groupBy.length > 0) {
      // Gruppierte Aggregation
      const qb = this.em.createQueryBuilder(entityClass, 'e');
      groupBy.forEach((gb) => qb.addSelect(`e.${gb}`));
      qb.select(`e.${field}`);
      qb.addSelect(`${aggregation}(e.${field}) as value`);
      qb.groupBy(groupBy.map((gb) => `e.${gb}`).join(', '));
      qb.where(where);
      result = await qb.execute();
    } else {
      // Einfache Aggregation
      const qb = this.em.createQueryBuilder(entityClass, 'e');
      qb.select(`${aggregation}(e.${field}) as value`);
      qb.where(where);
      result = await qb.execute();
      result = result[0]?.value;
    }
    return { kpi: kpi, value: result };
  }
}
