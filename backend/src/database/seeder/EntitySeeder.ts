import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from 'src/entity/EntityItem';

export class EntitySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EntityItem);

    if (count === 0) {
      em.create(EntityItem, { handle: 'company' });
      em.create(EntityItem, { handle: 'entity' });
      em.create(EntityItem, { handle: 'group' });
      em.create(EntityItem, { handle: 'language' });
      em.create(EntityItem, { handle: 'note' });
      em.create(EntityItem, { handle: 'permission' });
      em.create(EntityItem, { handle: 'person' });
      em.create(EntityItem, { handle: 'right' });
      em.create(EntityItem, { handle: 'ticket' });
      em.create(EntityItem, { handle: 'ticketPriority' });
      em.create(EntityItem, { handle: 'ticketStatus' });
      em.create(EntityItem, { handle: 'translation' });
      em.create(EntityItem, { handle: 'route' });
    }
  }
}
