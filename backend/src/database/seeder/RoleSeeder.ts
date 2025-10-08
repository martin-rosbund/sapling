import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { RoleItem } from 'src/entity/RoleItem';
import roleData from './json/roleData.json';
import { RoleStageItem } from 'src/entity/RoleStageItem';

export class RoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RoleItem);
    if (count === 0) {
      for (const r of roleData) {
        const stage = await em.findOne(RoleStageItem, {
                    handle: r.stage
        });
        if (stage) {
          em.create(RoleItem, { ...r, stage });
        }
      }
    }
  }
}
