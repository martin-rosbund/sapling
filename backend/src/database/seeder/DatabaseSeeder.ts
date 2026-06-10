import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { TranslationSeeder } from './TranslationSeeder';
import { GenericSeeder } from './GenericSeeder';
import { loadSeedJson } from './utils/load-seed-json';
import { AddressItem } from '../../entity/AddressItem';
import { AddressTypeItem } from '../../entity/AddressTypeItem';
import { CompanyItem } from '../../entity/CompanyItem';
import { CompanyAnnualRevenueClassItem } from '../../entity/CompanyAnnualRevenueClassItem';
import { CompanyChurnRiskReasonItem } from '../../entity/CompanyChurnRiskReasonItem';
import { CompanyIndustryItem } from '../../entity/CompanyIndustryItem';
import { CompanyRelationshipItem } from '../../entity/CompanyRelationshipItem';
import { CompanyRelationshipTypeItem } from '../../entity/CompanyRelationshipTypeItem';
import { CompanySegmentItem } from '../../entity/CompanySegmentItem';
import { CompanySizeItem } from '../../entity/CompanySizeItem';
import { DashboardTemplateItem } from '../../entity/DashboardTemplateItem';
import { PermissionSeeder } from './PermissionSeeder';
import { ContractItem } from '../../entity/ContractItem';
import { ContractServiceItem } from '../../entity/ContractServiceItem';
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
import { FavoriteTemplateItem } from '../../entity/FavoriteTemplateItem';
import { KpiAggregationItem } from '../../entity/KpiAggregationItem';
import { KpiTimeframeItem } from '../../entity/KpiTimeframeItem';
import { KpiTypeItem } from '../../entity/KpiTypeItem';
import { EventStatusItem } from '../../entity/EventStatusItem';
import { KpiItem } from '../../entity/KpiItem';
import { WorkHourWeekItem } from '../../entity/WorkHourWeekItem';
import { WorkHourItem } from '../../entity/WorkHourItem';
import { PersonDepartmentItem } from '../../entity/PersonDepartmentItem';
import { PersonDecisionRoleItem } from '../../entity/PersonDecisionRoleItem';
import { PersonFunctionItem } from '../../entity/PersonFunctionItem';
import { PersonJobTitleItem } from '../../entity/PersonJobTitleItem';
import { PersonSalutationItem } from '../../entity/PersonSalutationItem';
import { PersonTypeItem } from '../../entity/PersonTypeItem';
import { PersonTitleItem } from '../../entity/PersonTitleItem';
import { WebhookAuthenticationTypeItem } from '../../entity/WebhookAuthenticationTypeItem';
import { WebhookSubscriptionTypeItem } from '../../entity/WebhookSubscriptionTypeItem';
import { WebhookSubscriptionMethodItem } from '../../entity/WebhookSubscriptionMethodItem';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryStatusItem } from '../../entity/WebhookDeliveryStatusItem';
import { WebhookSubscriptionPayloadType } from '../../entity/WebhookSubscriptionPayloadType';
import { CountryItem } from '../../entity/CountryItem';
import { SalesOpportunityStageItem } from '../../entity/SalesOpportunityStageItem';
import { SalesOpportunityForecastItem } from '../../entity/SalesOpportunityForecastItem';
import { SalesOpportunitySourceItem } from '../../entity/SalesOpportunitySourceItem';
import { SalesOpportunityLossReasonItem } from '../../entity/SalesOpportunityLossReasonItem';
import { SalesOpportunityResultStatusItem } from '../../entity/SalesOpportunityResultStatusItem';
import { EntityRouteItem } from '../../entity/EntityRouteItem';
import { ChangeLogActionItem } from '../../entity/ChangeLogActionItem';
import { SalesOpportunityItem } from '../../entity/SalesOpportunityItem';
import { MoneyItem } from '../../entity/MoneyItem';
import { DocumentTypeItem } from '../../entity/DocumentTypeItem';
import { ServerLandscapeItem } from '../../entity/ServerLandscapeItem';
import { ServerLandscapeTypeItem } from '../../entity/ServerLandscapeTypeItem';
import { ServerLandscapeTypeUsageItem } from '../../entity/ServerLandscapeTypeUsageItem';
import { SocialMediaItem } from '../../entity/SocialMediaItem';
import { SocialMediaTypeItem } from '../../entity/SocialMediaTypeItem';
import { EmailTemplateItem } from '../../entity/EmailTemplateItem';
import { EMailListItem } from '../../entity/EMailListItem';
import { ScriptButtonItem } from '../../entity/ScriptButtonItem';
import { AiChatTranscriptionItem } from '../../entity/AiChatTranscriptionItem';
import { AiEntityGenerationTemplateItem } from '../../entity/AiEntityGenerationTemplateItem';
import { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import { McpServerConfigItem } from '../../entity/McpServerConfigItem';
import { PhoneCallItem } from '../../entity/PhoneCallItem';
import { TicketTypeItem } from '../../entity/TicketTypeItem';
import { TicketCategoryItem } from '../../entity/TicketCategoryItem';
import { TicketSourceItem } from '../../entity/TicketSourceItem';
import { SupportTeamItem } from '../../entity/SupportTeamItem';
import { SupportQueueItem } from '../../entity/SupportQueueItem';
import { SlaPolicyItem } from '../../entity/SlaPolicyItem';
import { TeamsTemplateItem } from '../../entity/TeamsTemplateItem';
import { TeamsSubscriptionItem } from '../../entity/TeamsSubscriptionItem';
import { TeamsDeliveryItem } from '../../entity/TeamsDeliveryItem';
import { TeamsDeliveryStatusItem } from '../../entity/TeamsDeliveryStatusItem';
import { InboxTemplateItem } from '../../entity/InboxTemplateItem';
import { InboxSubscriptionItem } from '../../entity/InboxSubscriptionItem';
import { InboxNotificationItem } from '../../entity/InboxNotificationItem';
import { HolidayItem } from '../../entity/HolidayItem';
import { HolidayGroupItem } from '../../entity/HolidayGroupItem';
import { EffortEstimateItem } from '../../entity/EffortEstimateItem';
import { EffortEstimatePositionItem } from '../../entity/EffortEstimatePositionItem';
import { EffortEstimatePositionTemplateItem } from '../../entity/EffortEstimatePositionTemplateItem';
import { EffortEstimateStatusItem } from '../../entity/EffortEstimateStatusItem';
import { KnowledgeArticleItem } from '../../entity/KnowledgeArticleItem';
import { KnowledgeArticleCategoryItem } from '../../entity/KnowledgeArticleCategoryItem';
import { KnowledgeArticleStatusItem } from '../../entity/KnowledgeArticleStatusItem';
import { KnowledgeArticleVisibilityItem } from '../../entity/KnowledgeArticleVisibilityItem';
import { RoleStarterSeeder } from './RoleStarterSeeder';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import type { EntityName } from '@mikro-orm/core';
import { MarketingCampaignItem } from '../../entity/MarketingCampaignItem';
import { MarketingCampaignStatusItem } from '../../entity/MarketingCampaignStatusItem';
import { MarketingCampaignTypeItem } from '../../entity/MarketingCampaignTypeItem';
import { ImportSourceItem } from '../../entity/ImportSourceItem';

/**
 * Declarative seed order.
 *
 * Each entry is either:
 *  - an entity class — gets wrapped in `GenericSeeder.for(entity)` at runtime
 *    and seeded from `seeder/json-{env}/{entity}/{entity}Data_NNN.json`, or
 *  - a specialized seeder class (e.g. {@link TranslationSeeder},
 *    {@link PermissionSeeder}, {@link RoleStarterSeeder}) — used as-is.
 *
 * Reorder carefully — entries depend on the rows above them being seeded
 * first (foreign keys).
 */
const SEED_ORDER: Array<EntityName<object> | (new () => Seeder)> = [
  LanguageItem,
  MoneyItem,
  CountryItem,
  TranslationSeeder,
  WorkHourItem,
  WorkHourWeekItem,
  HolidayGroupItem,
  AddressTypeItem,
  CompanyIndustryItem,
  CompanySegmentItem,
  CompanySizeItem,
  CompanyAnnualRevenueClassItem,
  CompanyChurnRiskReasonItem,
  CompanyItem,
  AddressItem,
  CompanyRelationshipTypeItem,
  CompanyRelationshipItem,
  EntityGroupItem,
  EntityItem,
  EntityRouteItem,
  ChangeLogActionItem,
  ScriptButtonItem,
  KpiAggregationItem,
  KpiTimeframeItem,
  KpiTypeItem,
  KpiItem,
  RoleStageItem,
  RoleItem,
  PermissionSeeder,
  PersonDepartmentItem,
  PersonDecisionRoleItem,
  PersonFunctionItem,
  PersonJobTitleItem,
  PersonSalutationItem,
  PersonTitleItem,
  PersonTypeItem,
  PersonItem,
  PhoneCallItem,
  SocialMediaTypeItem,
  SocialMediaItem,
  TicketPriorityItem,
  TicketStatusItem,
  TicketTypeItem,
  TicketCategoryItem,
  TicketSourceItem,
  SupportTeamItem,
  SlaPolicyItem,
  SupportQueueItem,
  NoteGroupItem,
  EventStatusItem,
  EventDeliveryStatusItem,
  EventTypeItem,
  HolidayItem,
  ContractServiceItem,
  ContractItem,
  TicketItem,
  EventItem,
  DashboardTemplateItem,
  FavoriteTemplateItem,
  RoleStarterSeeder,
  ServerLandscapeTypeItem,
  ServerLandscapeTypeUsageItem,
  ServerLandscapeItem,
  ProductItem,
  NoteItem,
  WebhookAuthenticationTypeItem,
  WebhookSubscriptionTypeItem,
  WebhookSubscriptionPayloadType,
  WebhookSubscriptionMethodItem,
  WebhookDeliveryStatusItem,
  WebhookSubscriptionItem,
  SalesOpportunityStageItem,
  SalesOpportunityForecastItem,
  SalesOpportunitySourceItem,
  SalesOpportunityLossReasonItem,
  SalesOpportunityResultStatusItem,
  SalesOpportunityItem,
  EffortEstimateStatusItem,
  EffortEstimatePositionTemplateItem,
  EffortEstimateItem,
  EffortEstimatePositionItem,
  KnowledgeArticleStatusItem,
  KnowledgeArticleVisibilityItem,
  KnowledgeArticleCategoryItem,
  KnowledgeArticleItem,
  DocumentTypeItem,
  EmailTemplateItem,
  EMailListItem,
  MarketingCampaignStatusItem,
  MarketingCampaignTypeItem,
  MarketingCampaignItem,
  TeamsTemplateItem,
  TeamsDeliveryStatusItem,
  TeamsSubscriptionItem,
  TeamsDeliveryItem,
  InboxTemplateItem,
  InboxSubscriptionItem,
  InboxNotificationItem,
  AiChatTranscriptionItem,
  AiProviderTypeItem,
  AiProviderModelItem,
  AiEntityGenerationTemplateItem,
  McpServerConfigItem,
  ImportSourceItem,
];

function isEntityClass(
  entry: EntityName<object> | (new () => Seeder),
): entry is EntityName<object> {
  return ENTITY_REGISTRY.some((registryEntry) => registryEntry.class === entry);
}

// entfernt

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Main database seeder. Runs all seeders in the required order to initialize the database with entities, translations, permissions, and other data.
 *
 * @method          run                     Executes all seeders in sequence to initialize the database.
 * @method          loadJsonData            Static method to load JSON data for seeding.
 */
export class DatabaseSeeder extends Seeder {
  /**
   * Runs all seeders in the required order to initialize the database.
   */
  /**
   * Executes all seeders in sequence to initialize the database.
   * Calls each seeder for entities, translations, permissions, and more.
   *
   * The order is expressed declaratively via {@link SEED_ORDER}; entries that
   * are entity classes are wrapped in a `GenericSeeder.for(...)`, special
   * seeders (e.g. {@link TranslationSeeder}, {@link PermissionSeeder},
   * {@link RoleStarterSeeder}) are forwarded as-is.
   * @param {EntityManager} em - MikroORM entity manager
   * @returns {Promise<void>}
   */
  async run(em: EntityManager): Promise<void> {
    const seeders = SEED_ORDER.map((entry) =>
      isEntityClass(entry)
        ? GenericSeeder.for(entry)
        : (entry as new () => Seeder),
    );

    await em.transactional(async (transactionalEm) => {
      await transactionalEm
        .getConnection('write')
        .execute(
          'set constraints all deferred',
          [],
          'run',
          transactionalEm.getTransactionContext(),
        );

      for (const SeederClass of seeders) {
        const fork = transactionalEm.fork({ keepTransactionContext: true });
        const seeder = new SeederClass();
        await seeder.run(fork);
        await fork.flush();
        fork.clear();
      }
    });
  }

  /**
   * Static method to load JSON data for seeding.
   * Delegates to the shared {@link loadSeedJson} helper.
   * @param {string} fileBase - Base filename (without extension)
   * @returns {T[]} - Parsed array of data
   */
  static loadJsonData<T>(fileBase: string): T[] {
    return loadSeedJson<T>(fileBase);
  }
}
