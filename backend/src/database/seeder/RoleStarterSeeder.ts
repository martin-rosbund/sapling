import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DB_DATA_SEEDER } from '../../constants/project.constants';
import { DashboardTemplateItem } from '../../entity/DashboardTemplateItem';
import { FavoriteTemplateItem } from '../../entity/FavoriteTemplateItem';
import { RoleItem } from '../../entity/RoleItem';

type RoleStarterTemplateSeed = {
  role: string;
  templates: string[];
};

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

    await this.applyDashboardAssignments(em, roleByTitle);
    await this.applyFavoriteAssignments(em, roleByTitle);
    await em.flush();
  }

  private async applyDashboardAssignments(
    em: EntityManager,
    roleByTitle: Map<string, RoleItem>,
  ): Promise<void> {
    const seedItems = this.loadJsonData(
      'roleStarterDashboard/roleStarterDashboardData_001',
    );
    const templateItems = await em.find(DashboardTemplateItem, {});
    const templateByName = new Map(
      templateItems.map((templateItem) => [templateItem.name, templateItem]),
    );

    for (const seedItem of seedItems) {
      const roleItem = this.requireRole(roleByTitle, seedItem.role);
      const resolvedTemplates = seedItem.templates.map((templateName) =>
        this.requireTemplate(
          templateByName,
          templateName,
          'dashboard template',
          seedItem.role,
        ),
      );

      roleItem.starterDashboardTemplates.set(resolvedTemplates);
    }
  }

  private async applyFavoriteAssignments(
    em: EntityManager,
    roleByTitle: Map<string, RoleItem>,
  ): Promise<void> {
    const seedItems = this.loadJsonData(
      'roleStarterFavorite/roleStarterFavoriteData_001',
    );
    const templateItems = await em.find(FavoriteTemplateItem, {});
    const templateByName = new Map(
      templateItems.map((templateItem) => [templateItem.name, templateItem]),
    );

    for (const seedItem of seedItems) {
      const roleItem = this.requireRole(roleByTitle, seedItem.role);
      const resolvedTemplates = seedItem.templates.map((templateName) =>
        this.requireTemplate(
          templateByName,
          templateName,
          'favorite template',
          seedItem.role,
        ),
      );

      roleItem.starterFavoriteTemplates.set(resolvedTemplates);
    }
  }

  private loadJsonData(fileBase: string): RoleStarterTemplateSeed[] {
    const jsonPath = join(
      __dirname,
      `./json-${DB_DATA_SEEDER}/${fileBase}.json`,
    );
    const fileContent = readFileSync(jsonPath, 'utf-8');
    return JSON.parse(fileContent) as RoleStarterTemplateSeed[];
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

  private requireTemplate<T>(
    templateByName: Map<string, T>,
    templateName: string,
    templateType: string,
    roleTitle: string,
  ): T {
    const templateItem = templateByName.get(templateName);

    if (!templateItem) {
      throw new Error(
        `Role starter seeding failed. Unknown ${templateType} "${templateName}" for role "${roleTitle}"`,
      );
    }

    return templateItem;
  }
}
