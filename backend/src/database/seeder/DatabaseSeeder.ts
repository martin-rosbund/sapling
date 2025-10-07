import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageSeeder } from './LanguageSeeder';
import { TranslationSeeder } from './TranslationSeeder';
import { CompanySeeder } from './CompanySeeder';
import { PersonSeeder } from './PersonSeeder';
import { EntitySeeder } from './EntitySeeder';
import { RoleSeeder } from './RoleSeeder';
import { PermissionSeeder } from './PermissionSeeder';
import { RightSeeder } from './RightSeeder';
import { TicketPrioritySeeder } from './TicketPrioritySeeder';
import { TicketStatusSeeder } from './TicketStatusSeeder';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [
      LanguageSeeder,
      TranslationSeeder,
      CompanySeeder,
      PersonSeeder,
      EntitySeeder,
      RoleSeeder,
      RightSeeder,
      PermissionSeeder,
      TicketPrioritySeeder,
      TicketStatusSeeder,
    ]);
  }
}
