// Seeder for populating the database with initial event type data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import eventTypeData from './json/eventTypeData.json';
import { EventTypeItem } from 'src/entity/EventTypeItem';

export class EventTypeSeeder extends Seeder {
  /**
   * Runs the event type seeder. If there are no event types, it creates them from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(EventTypeItem);
    if (count === 0) {
      for (const e of eventTypeData) {
        em.create(EventTypeItem, e);
      }
    }
  }
}
