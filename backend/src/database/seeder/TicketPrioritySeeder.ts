// Seeder for populating the database with initial ticket priority data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TicketPriorityItem } from 'src/entity/TicketPriorityItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class TicketPrioritySeeder extends Seeder {
  /**
   * Runs the ticket priority seeder. If there are no priorities, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketPriorityItem);
    if (count === 0) {
      const data =
        DatabaseSeeder.loadJsonData<TicketPriorityItem>('ticketPriorityData');
      for (const t of data) {
        em.create(TicketPriorityItem, t);
      }
    }
  }
}
