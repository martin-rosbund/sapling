import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TranslationSeeder } from './TranslationSeeder';
import { GenericSeeder } from './GenericSeeder';
import { CompanyItem } from '../../entity/CompanyItem';
import { DashboardItem } from '../../entity/DashboardItem';
import { PermissionSeeder } from './PermissionSeeder';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ContractItem } from '../../entity/ContractItem';
import { LanguageItem } from '../../entity/LanguageItem';
import { EntityGroupItem } from '../../entity/EntityGroupItem';
import { EntityItem } from '../../entity/EntityItem';
import { RoleStageItem } from '../../entity/RoleStageItem';
import { RoleItem } from '../../entity/RoleItem';
import { PersonItem } from '../../entity/PersonItem';
import { TicketPriorityItem } from '../../entity/TicketPriorityItem';
import { TicketStatusItem } from '../../entity/TicketStatusItem';
import { NoteGroupItem } from '../../entity/NoteGroupItem';
import { EventTypeItem } from '../../entity/EventTypeItem';
import { TicketItem } from '../../entity/TicketItem';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryStatusItem } from '../../entity/EventDeliveryStatusItem';
import { ProductItem } from '../../entity/ProductItem';
import { NoteItem } from '../../entity/NoteItem';
import { FavoriteItem } from '../../entity/FavoriteItem';
import { KpiAggregationItem } from '../../entity/KpiAggregationItem';
import { KpiTimeframeItem } from '../../entity/KpiTimeframeItem';
import { KpiTypeItem } from '../../entity/KpiTypeItem';
import { EventStatusItem } from '../../entity/EventStatusItem';
import { KpiItem } from '../../entity/KpiItem';
import { WorkHourWeekItem } from '../../entity/WorkHourWeekItem';
import { WorkHourItem } from '../../entity/WorkHourItem';
import { DB_DATA_SEEDER } from '../../constants/project.constants';
import { PersonTypeItem } from '../../entity/PersonTypeItem';
import { WebhookAuthenticationTypeItem } from '../../entity/WebhookAuthenticationTypeItem';
import { WebhookSubscriptionTypeItem } from '../../entity/WebhookSubscriptionTypeItem';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryStatusItem } from 'src/entity/WebhookDeliveryStatusItem';
// entfernt

export class DatabaseSeeder extends Seeder {
  /**
   * Runs all seeders in the required order to initialize the database.
   */
  async run(em: EntityManager): Promise<void> {
    await this.call(em, [
      GenericSeeder.for(LanguageItem),
      TranslationSeeder,
      GenericSeeder.for(WorkHourItem),
      GenericSeeder.for(WorkHourWeekItem),
      GenericSeeder.for(CompanyItem),
      GenericSeeder.for(EntityGroupItem),
      GenericSeeder.for(EntityItem),
      GenericSeeder.for(KpiAggregationItem),
      GenericSeeder.for(KpiTimeframeItem),
      GenericSeeder.for(KpiTypeItem),
      GenericSeeder.for(KpiItem),
      GenericSeeder.for(RoleStageItem),
      GenericSeeder.for(RoleItem),
      PermissionSeeder,
      GenericSeeder.for(PersonTypeItem),
      GenericSeeder.for(PersonItem),
      GenericSeeder.for(TicketPriorityItem),
      GenericSeeder.for(TicketStatusItem),
      GenericSeeder.for(NoteGroupItem),
      GenericSeeder.for(EventStatusItem),
      GenericSeeder.for(EventDeliveryStatusItem),
      GenericSeeder.for(EventTypeItem),
      GenericSeeder.for(TicketItem),
      GenericSeeder.for(EventItem),
      GenericSeeder.for(DashboardItem),
      GenericSeeder.for(ContractItem),
      GenericSeeder.for(ProductItem),
      GenericSeeder.for(NoteItem),
      GenericSeeder.for(FavoriteItem),
      GenericSeeder.for(WebhookAuthenticationTypeItem),
      GenericSeeder.for(WebhookSubscriptionTypeItem),
      GenericSeeder.for(WebhookDeliveryStatusItem),
      GenericSeeder.for(WebhookSubscriptionItem),
    ]);
  }

  /**
   * Generic static method to load JSON data with import assertion
   */
  static loadJsonData<T>(fileBase: string): T[] {
    const env = DB_DATA_SEEDER;
    const jsonPath = join(__dirname, `./json-${env}/${fileBase}.json`);
    const fileContent = readFileSync(jsonPath, 'utf-8');
    return JSON.parse(fileContent) as T[];
  }
}
