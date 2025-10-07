import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TicketStatusItem } from 'src/entity/TicketStatusItem';

export class TicketStatusSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(TicketStatusItem);

    if (count === 0) {
      em.create(TicketStatusItem, {
        handle: 'open',
        description: 'Offen',
      });
      em.create(TicketStatusItem, {
        handle: 'waiting',
        description: 'Wartend',
      });
      em.create(TicketStatusItem, {
        handle: 'in_progress',
        description: 'In Bearbeitung',
      });
      em.create(TicketStatusItem, {
        handle: 'closed',
        description: 'Geschlossen',
      });
    }
  }
}
