import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TicketPriorityItem } from 'src/entity/TicketPriorityItem';

export class TicketPrioritySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketPriorityItem);

    if (count === 0) {
      em.create(TicketPriorityItem, {
        handle: 'normal',
        description: 'Normale Priorität',
        color: '#00FF00',
      });
      em.create(TicketPriorityItem, {
        handle: 'medium',
        description: 'Mittlere Priorität',
        color: '#FFFF00',
      });
      em.create(TicketPriorityItem, {
        handle: 'high',
        description: 'Hohe Priorität',
        color: '#FF0000',
      });
    }
  }
}
