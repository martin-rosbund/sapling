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

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Seeder for populating the database with initial translation data. Loads translations from JSON scripts for multiple languages and tracks execution status.
 *
 * @typedef         TranslationFileItem      Structure of translation file item (entity, property, de, en)
 *
 * @method          run                     Executes translation seeding, loading JSON scripts and creating translation records for each language.
 */
export class TranslationSeeder extends Seeder {
  /**
   * Runs the translation seeder. If there are no translations for 'login', it creates translations for DE and EN from the JSON data.
   */
  filterUniqueTranslations(data: TranslationFileItem[], lang: 'de' | 'en') {
    const seen = new Set();
    return data.filter((t) => {
      const key = `${t.entity}|${t.property}|${lang}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  /**
   * Executes translation seeding.
   * Loads translation scripts, checks execution status, and creates translation records for DE and EN languages.
   * @param {EntityManager} em - MikroORM entity manager
   * @returns {Promise<void>}
   */
  async run(em: EntityManager): Promise<void> {
    const entityHandle = 'translation';
    const scriptsDir = path.join(
      __dirname,
      `./json-${DB_DATA_SEEDER}/${entityHandle}`,
    );
    if (!fs.existsSync(scriptsDir)) {
      global.log.warn(
        `No scripts directory found for ${entityHandle}: ${scriptsDir}`,
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
        entityHandle,
        isSuccess: true,
      });
      if (alreadyRun) {
        global.log.info(
          `Script ${scriptName} for ${entityHandle} already executed at ${alreadyRun['executedAt'] ? new Date(alreadyRun['executedAt']).toISOString() : 'unknown'}. Skipping.`,
        );
        continue;
      }
      const filePath = path.join(scriptsDir, scriptFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as any[];
      global.log.info(
        `Seeding ${entityHandle} from script ${scriptName}: ${data.length} records.`,
      );
      try {
        if (de) {
          for (const t of this.filterUniqueTranslations(
            data as TranslationFileItem[],
            'de',
          )) {
            em.create(TranslationItem, {
              ...t,
              value: t.de,
              language: de,
            });
          }
        }
        if (en) {
          for (const t of this.filterUniqueTranslations(
            data as TranslationFileItem[],
            'en',
          )) {
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
        statusItem.entityHandle = entityHandle;
        statusItem.executedAt = new Date();
        statusItem.isSuccess = true;
        await em.persist(statusItem).flush();
        global.log.info(
          `Script ${scriptName} for ${entityHandle} executed successfully.`,
        );
      } catch (err) {
        const statusItem = new SeedScriptItem();
        statusItem.scriptName = scriptName;
        statusItem.entityHandle = entityHandle;
        statusItem.executedAt = new Date();
        statusItem.isSuccess = false;
        await em.persist(statusItem).flush();
        global.log.error(
          `Script ${scriptName} for ${entityHandle} failed: ${err}`,
        );
      }
    }
  }
}
