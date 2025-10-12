import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { EntityItem } from 'src/entity/EntityItem';
import entityData from './json/entityData.json';
import { EntityGroupItem } from 'src/entity/EntityGroupItem';

export class EntitySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityItem);
    const groups = await em.findAll(EntityGroupItem);

    if (count === 0) {
      for (const e of entityData) {
        em.create(EntityItem, {
          ...e,
          group: groups.find((g) => g.handle === e.group) || undefined,
        });
      }
    }
  }
}
