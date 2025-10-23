// Seeder for populating the database with initial ticket  data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TicketItem } from 'src/entity/TicketItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class TicketSeeder extends Seeder {
  /**
   * Runs the ticket  seeder. If there are no priorities, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketItem);
    if (count === 0) {
      const data = DatabaseSeeder.loadJsonData<TicketItem>('ticketData');
      for (const t of data) {
        em.create(TicketItem, t);
      }
    }
  }
}
