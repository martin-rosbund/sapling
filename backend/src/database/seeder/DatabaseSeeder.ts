// Main database seeder that runs all individual seeders in the correct order.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageSeeder } from './LanguageSeeder';
import { TranslationSeeder } from './TranslationSeeder';
import { CompanySeeder } from './CompanySeeder';
import { PersonSeeder } from './PersonSeeder';
import { EntitySeeder } from './EntitySeeder';
import { RoleSeeder } from './RoleSeeder';
import { PermissionSeeder } from './PermissionSeeder';
import { TicketPrioritySeeder } from './TicketPrioritySeeder';
import { TicketStatusSeeder } from './TicketStatusSeeder';
import { RoleStageSeeder } from './RoleStageSeeder';
import { EntityGroupSeeder } from './EntityGroupSeeder';
import { KPISeeder } from './KPISeeder';
import { NoteGroupSeeder } from './NoteGroupSeeder';
import { EventTypeSeeder } from './EventTypeSeeder';
import { TicketSeeder } from './TicketSeeder';
import { EventSeeder } from './EventSeeder';

export class DatabaseSeeder extends Seeder {
  /**
   * Runs all seeders in the required order to initialize the database.
   */
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [
      LanguageSeeder,
      TranslationSeeder,
      CompanySeeder,
      EntityGroupSeeder,
      EntitySeeder,
      KPISeeder,
      RoleStageSeeder,
      RoleSeeder,
      PermissionSeeder,
      PersonSeeder,
      TicketPrioritySeeder,
      TicketStatusSeeder,
      NoteGroupSeeder,
      EventTypeSeeder,
      TicketSeeder,
      EventSeeder,
    ]);
  }
}
