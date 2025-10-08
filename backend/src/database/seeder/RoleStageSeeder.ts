import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { RoleStageItem } from 'src/entity/RoleStageItem';
import roleData from './json/roleStageData.json';

export class RoleStageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RoleStageItem);
    if (count === 0) {
      for (const r of roleData) {
        em.create(RoleStageItem, r);
      }
    }
  }
}
