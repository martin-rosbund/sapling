import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TranslationSeeder } from './TranslationSeeder';
import { GenericSeeder } from './GenericSeeder';
import { CompanyItem } from 'src/entity/CompanyItem';
import { DashboardItem } from 'src/entity/DashboardItem';
import { ContractItem } from 'src/entity/ContractItem';
import { PermissionSeeder } from './PermissionSeeder';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LanguageItem } from 'src/entity/LanguageItem';
import { EntityGroupItem } from 'src/entity/EntityGroupItem';
import { EntityItem } from 'src/entity/EntityItem';
import { KPIItem } from 'src/entity/KPIItem';
import { RoleStageItem } from 'src/entity/RoleStageItem';
import { RoleItem } from 'src/entity/RoleItem';
import { PersonItem } from 'src/entity/PersonItem';
import { TicketPriorityItem } from 'src/entity/TicketPriorityItem';
import { TicketStatusItem } from 'src/entity/TicketStatusItem';
import { NoteGroupItem } from 'src/entity/NoteGroupItem';
import { EventTypeItem } from 'src/entity/EventTypeItem';
import { TicketItem } from 'src/entity/TicketItem';
import { EventItem } from 'src/entity/EventItem';
import { ProductItem } from 'src/entity/ProductItem';
import { NoteItem } from 'src/entity/NoteItem';
import { FavoriteItem } from 'src/entity/FavoriteItem';
import { KPIAggregationItem } from 'src/entity/KPIAggregationItem';
import { KPITimeframeItem } from 'src/entity/KPITimeframeItem';

export class DatabaseSeeder extends Seeder {
  /**
   * Runs all seeders in the required order to initialize the database.
   */
  async run(em: EntityManager): Promise<void> {
  await this.call(em, [
    GenericSeeder.for(LanguageItem),
    TranslationSeeder,
    GenericSeeder.for(CompanyItem),
    GenericSeeder.for(EntityGroupItem),
    GenericSeeder.for(EntityItem),
    GenericSeeder.for(KPIAggregationItem),
    GenericSeeder.for(KPITimeframeItem),
    GenericSeeder.for(KPIItem),
    GenericSeeder.for(RoleStageItem),
    GenericSeeder.for(RoleItem),
    PermissionSeeder,
    GenericSeeder.for(PersonItem),
    GenericSeeder.for(TicketPriorityItem),
    GenericSeeder.for(TicketStatusItem),
    GenericSeeder.for(NoteGroupItem),
    GenericSeeder.for(EventTypeItem),
    GenericSeeder.for(TicketItem),
    GenericSeeder.for(EventItem),
    GenericSeeder.for(DashboardItem),
    GenericSeeder.for(ContractItem),
    GenericSeeder.for(ProductItem),
    GenericSeeder.for(NoteItem),
    GenericSeeder.for(FavoriteItem),
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
