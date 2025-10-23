// Seeder for populating the database with initial ticket  data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { TicketItem } from 'src/entity/TicketItem';

export class TicketSeeder extends Seeder {
  /**
   * Runs the ticket  seeder. If there are no priorities, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketItem);
    if (count === 0) {
      const env = process.env.DB_DATA_SEEDER || 'demo';
      const module = (await import(`./json-${env}/ticketData.json`)) as {
        default: TicketItem[];
      };
      const data = module.default;
      for (const t of data) {
        em.create(TicketItem, t);
      }
    }
  }
}
