import { EntityManager, EntityName, Collection } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { DB_DATA_SEEDER } from '../../constants/project.constants';
import { DashboardTemplateItem } from '../../entity/DashboardTemplateItem';
import { FavoriteTemplateItem } from '../../entity/FavoriteTemplateItem';
import { RoleItem } from '../../entity/RoleItem';

type RoleStarterTemplateSeed = {
  role: string;
  templates: string[];
};

type RoleStarterSeedFile = {
  scriptName: string;
  seedItems: RoleStarterTemplateSeed[];
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
      'roleStarterDashboard',
      'roleStarterDashboardData',
      'dashboard template',
      (role) => role.starterDashboardTemplates,
    );
    await this.applyAssignments(
      em,
      roleByTitle,
      FavoriteTemplateItem,
      'roleStarterFavorite',
      'roleStarterFavoriteData',
      'favorite template',
      (role) => role.starterFavoriteTemplates,
    );
    await em.flush();
  }

  private async applyAssignments<T extends TemplateLike>(
    em: EntityManager,
    roleByTitle: Map<string, RoleItem>,
    templateClass: EntityName<T>,
    seedFolder: string,
    filePrefix: string,
    templateType: string,
    getCollection: RoleCollectionAccessor<T>,
  ): Promise<void> {
    const seedFiles = this.loadSeedFiles(seedFolder, filePrefix);
    const templateItems = await em.find(templateClass, {});
    const templateByName = new Map(
      templateItems.map((templateItem) => [templateItem.name, templateItem]),
    );

    for (const seedFile of seedFiles) {
      global.log.info(
        `Applying ${templateType} role starter assignments from script ${seedFile.scriptName}: ${seedFile.seedItems.length} records.`,
      );

      for (const seedItem of seedFile.seedItems) {
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
  }

  private loadSeedFiles(
    seedFolder: string,
    filePrefix: string,
  ): RoleStarterSeedFile[] {
    const scriptsDir = join(__dirname, `json-${DB_DATA_SEEDER}`, seedFolder);

    if (!existsSync(scriptsDir)) {
      global.log.warn(
        `No scripts directory found for ${seedFolder}: ${scriptsDir}`,
      );
      return [];
    }

    return readdirSync(scriptsDir)
      .filter(
        (fileName) =>
          fileName.startsWith(`${filePrefix}_`) && fileName.endsWith('.json'),
      )
      .sort((left, right) => left.localeCompare(right))
      .map((scriptName) => {
        const filePath = join(scriptsDir, scriptName);
        const fileContent = readFileSync(filePath, 'utf-8');

        return {
          scriptName,
          seedItems: JSON.parse(fileContent) as RoleStarterTemplateSeed[],
        };
      });
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
