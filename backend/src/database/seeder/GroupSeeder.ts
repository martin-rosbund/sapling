import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { RoleItem } from 'src/entity/RoleItem';

export class RoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(RoleItem);

    if (count === 0) {
      em.create(RoleItem, { title: 'Administrator' });
      em.create(RoleItem, { title: 'Anwender' });
    }
  }
}
