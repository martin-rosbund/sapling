import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { TicketPriorityItem } from 'src/entity/TicketPriorityItem';
import ticketPriorityData from './json/ticketPriorityData.json';

export class TicketPrioritySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketPriorityItem);
    if (count === 0) {
      for (const t of ticketPriorityData) {
        em.create(TicketPriorityItem, t);
      }
    }
  }
}
