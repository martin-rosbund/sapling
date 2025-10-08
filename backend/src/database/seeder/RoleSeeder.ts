import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { RoleItem } from 'src/entity/RoleItem';
import roleData from './json/roleData.json';

export class RoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RoleItem);
    if (count === 0) {
      for (const r of roleData) {
        em.create(RoleItem, r);
      }
    }
  }
}
