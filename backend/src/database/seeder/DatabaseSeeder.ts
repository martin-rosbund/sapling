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
import { readFileSync } from 'fs';
import { join } from 'path';
import { DashboardSeeder } from './DashboardSeeder';
import { ProductSeeder } from './ProductSeeder';
import { ContractSeeder } from './ContractSeeder';
import { NoteSeeder } from './NoteSeeder';

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
      DashboardSeeder,
      ContractSeeder,
      ProductSeeder,
      NoteSeeder,
    ]);
  }

  /**
   * Generic static method to load JSON data with import assertion
   */
  static loadJsonData<T>(fileBase: string): T[] {
    const env = process.env.DB_DATA_SEEDER || 'demo';
    const jsonPath = join(__dirname, `./json-${env}/${fileBase}.json`);
    const fileContent = readFileSync(jsonPath, 'utf-8');
    return JSON.parse(fileContent) as T[];
  }
}
