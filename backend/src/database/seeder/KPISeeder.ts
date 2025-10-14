import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import kpiData from './json/kpiData.json';
import { KPIItem } from 'src/entity/KPIItem';
import { EntityItem } from 'src/entity/EntityItem';

export class KPISeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(KPIItem);
    if (count === 0) {
      for (const r of kpiData) {
        const targetEntity = await em.findOne(EntityItem, { handle: r.targetEntity });
        if (targetEntity) {
          em.create(KPIItem, {
            ...r,
            targetEntity,
          });
        }
      }
    }
  }
}
