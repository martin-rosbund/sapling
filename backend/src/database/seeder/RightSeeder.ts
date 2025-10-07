import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from 'src/entity/EntityItem';
import { RightItem } from 'src/entity/RightItem';

export class RightSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RightItem);
    const entities = await em.findAll(EntityItem);

    if (count === 0) {
      for (const entity of entities) {
        em.create(RightItem, {
          canRead: true,
          canInsert: true,
          canUpdate: true,
          canDelete: true,
          canShow: true,
          entity: entity,
        });
      }
    }
  }
}
