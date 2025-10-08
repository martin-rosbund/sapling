import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { TicketStatusItem } from 'src/entity/TicketStatusItem';
import ticketStatusData from './json/ticketStatusData.json';

export class TicketStatusSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketStatusItem);
    if (count === 0) {
      for (const t of ticketStatusData) {
        em.create(TicketStatusItem, t);
      }
    }
  }
}
