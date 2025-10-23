// Seeder for populating the database with initial ticket status data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TicketStatusItem } from 'src/entity/TicketStatusItem';
import { DatabaseSeeder } from './DatabaseSeeder';

export class TicketStatusSeeder extends Seeder {
  /**
   * Runs the ticket status seeder. If there are no statuses, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketStatusItem);
    if (count === 0) {
      const data =
        DatabaseSeeder.loadJsonData<TicketStatusItem>('ticketStatusData');
      for (const t of data) {
        em.create(TicketStatusItem, t);
      }
    }
  }
}
