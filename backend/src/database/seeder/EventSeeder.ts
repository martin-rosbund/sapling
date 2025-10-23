// Seeder for populating the database with initial Event data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EventItem } from 'src/entity/EventItem';

export class EventSeeder extends Seeder {
  /**
   * Runs the Event seeder. If there are no Events, it creates them from the JSON data.
   * Each Event is linked to a company, language, and role if found.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EventItem);
    if (count === 0) {
      const env = process.env.DB_DATA_SEEDER || 'demo';
      const module = (await import(`./json-${env}/eventData.json`)) as {
        default: EventItem[];
      };
      const data = module.default;

      for (const p of data) {
        em.create(EventItem, p);
      }
    }
  }
}
