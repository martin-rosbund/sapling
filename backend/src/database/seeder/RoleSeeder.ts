// Seeder for populating the database with initial role data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { RoleItem } from 'src/entity/RoleItem';
import roleData from './json/roleData.json';
import { RoleStageItem } from 'src/entity/RoleStageItem';

export class RoleSeeder extends Seeder {
  /**
   * Runs the role seeder. If there are no roles, it creates them from the JSON data.
   * Each role is linked to its stage if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RoleItem);
    if (count === 0) {
      for (const r of roleData) {
        const stage = await em.findOne(RoleStageItem, {
          handle: r.stage,
        });
        if (stage) {
          em.create(RoleItem, { ...r, stage });
        }
      }
    }
  }
}
