import { EntityManager, EntityName, Collection } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DashboardTemplateItem } from '../../entity/DashboardTemplateItem';
import { FavoriteTemplateItem } from '../../entity/FavoriteTemplateItem';
import { RoleItem } from '../../entity/RoleItem';
import { loadSeedJson } from './utils/load-seed-json';

type RoleStarterTemplateSeed = {
  role: string;
  templates: string[];
};

type TemplateLike = { name: string };
type RoleCollectionAccessor<T extends TemplateLike> = (
  role: RoleItem,
) => Collection<T>;

/**
 * Applies role starter template mappings after roles, persons and templates
 * already exist to avoid cyclic seeding dependencies.
 */
export class RoleStarterSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const roleItems = await em.find(
      RoleItem,
      {},
      {
        populate: ['starterDashboardTemplates', 'starterFavoriteTemplates'],
      },
    );

    const roleByTitle = new Map(
      roleItems.map((roleItem) => [roleItem.title, roleItem]),
    );

    await this.applyAssignments(
      em,
      roleByTitle,
      DashboardTemplateItem,
      'roleStarterDashboard/roleStarterDashboardData_001',
      'dashboard template',
      (role) => role.starterDashboardTemplates,
    );
    await this.applyAssignments(
      em,
      roleByTitle,
      FavoriteTemplateItem,
      'roleStarterFavorite/roleStarterFavoriteData_001',
      'favorite template',
      (role) => role.starterFavoriteTemplates,
    );
    await em.flush();
  }

  private async applyAssignments<T extends TemplateLike>(
    em: EntityManager,
    roleByTitle: Map<string, RoleItem>,
    templateClass: EntityName<T>,
    fileBase: string,
    templateType: string,
    getCollection: RoleCollectionAccessor<T>,
  ): Promise<void> {
    const seedItems = loadSeedJson<RoleStarterTemplateSeed>(fileBase);
    const templateItems = await em.find(templateClass, {});
    const templateByName = new Map(
      templateItems.map((templateItem) => [templateItem.name, templateItem]),
    );

    for (const seedItem of seedItems) {
      const roleItem = this.requireRole(roleByTitle, seedItem.role);
      const resolvedTemplates = seedItem.templates.flatMap((templateName) =>
        this.resolveTemplate(
          templateByName,
          templateName,
          templateType,
          seedItem.role,
        ),
      );

      getCollection(roleItem).set(resolvedTemplates);
    }
  }

  private requireRole(
    roleByTitle: Map<string, RoleItem>,
    roleTitle: string,
  ): RoleItem {
    const roleItem = roleByTitle.get(roleTitle);

    if (!roleItem) {
      throw new Error(
        `Role starter seeding failed. Unknown role: ${roleTitle}`,
      );
    }

    return roleItem;
  }

  private resolveTemplate<T>(
    templateByName: Map<string, T>,
    templateName: string,
    templateType: string,
    roleTitle: string,
  ): T[] {
    const templateItem = templateByName.get(templateName);

    if (!templateItem) {
      global.log.warn(
        `Skipping unknown ${templateType} "${templateName}" for role "${roleTitle}" during role starter seeding.`,
      );
      return [];
    }

    return [templateItem];
  }
}
