// Seeder for populating the database with initial translation data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from '../../entity/LanguageItem';
import { TranslationItem } from '../../entity/TranslationItem';
import { DB_DATA_SEEDER } from 'src/constants/project.constants';
import { SeedScriptItem } from 'src/entity/SeedScriptItem';
import fs from 'fs';
import path from 'path';

type TranslationFileItem = {
  entity: string;
  property: string;
  de: string;
  en: string;
};

export class TranslationSeeder extends Seeder {
  /**
   * Runs the translation seeder. If there are no translations for 'login', it creates translations for DE and EN from the JSON data.
   */
  async run(em: EntityManager): Promise<void> {
    const entityName = 'translation';
    const scriptsDir = path.join(
      __dirname,
      `./json-${DB_DATA_SEEDER}/${entityName}`,
    );
    if (!fs.existsSync(scriptsDir)) {
      global.log.warn(
        `No scripts directory found for ${entityName}: ${scriptsDir}`,
      );
      return;
    }
    const scriptFiles = fs
      .readdirSync(scriptsDir)
      .filter((f) => f.endsWith('.json'));
    const de = await em.findOne(LanguageItem, { handle: 'de' });
    const en = await em.findOne(LanguageItem, { handle: 'en' });
    for (const scriptFile of scriptFiles) {
      const scriptName = scriptFile;
      const alreadyRun = await em.findOne(SeedScriptItem, {
        scriptName,
        entityName,
        isSuccess: true,
      });
      if (alreadyRun) {
        global.log.info(
          `Script ${scriptName} for ${entityName} already executed at ${alreadyRun['executedAt'] ? new Date(alreadyRun['executedAt']).toISOString() : 'unknown'}. Skipping.`,
        );
        continue;
      }
      const filePath = path.join(scriptsDir, scriptFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as any[];
      global.log.info(
        `Seeding ${entityName} from script ${scriptName}: ${data.length} records.`,
      );
      try {
        if (de) {
          for (const t of data as TranslationFileItem[]) {
            em.create(TranslationItem, {
              ...t,
              value: t.de,
              language: de,
            });
          }
        }
        if (en) {
          for (const t of data as TranslationFileItem[]) {
            em.create(TranslationItem, {
              ...t,
              value: t.en,
              language: en,
            });
          }
        }
        await em.flush();
        const statusItem = new SeedScriptItem();
        statusItem.scriptName = scriptName;
        statusItem.entityName = entityName;
        statusItem.executedAt = new Date();
        statusItem.isSuccess = true;
        await em.persist(statusItem).flush();
        global.log.info(
          `Script ${scriptName} for ${entityName} executed successfully.`,
        );
      } catch (err) {
        const statusItem = new SeedScriptItem();
        statusItem.scriptName = scriptName;
        statusItem.entityName = entityName;
        statusItem.executedAt = new Date();
        statusItem.isSuccess = false;
        await em.persist(statusItem).flush();
        global.log.error(
          `Script ${scriptName} for ${entityName} failed: ${err}`,
        );
      }
    }
  }
}
