// Seeder for populating the database with initial translation data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { LanguageItem } from '../../entity/LanguageItem';
import { TranslationItem } from '../../entity/TranslationItem';
import { DB_DATA_SEEDER } from '../../constants/project.constants';
import { SeedScriptItem } from '../../entity/SeedScriptItem';
import { getErrorMessage } from '../../common/error.utils';
import fs from 'fs';
import path from 'path';

type TranslationFileItem = {
  entity: string;
  property: string;
  de: string;
  en: string;
};

type TranslationLanguage = 'de' | 'en';

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
  filterUniqueTranslations(
    data: TranslationFileItem[],
    lang: TranslationLanguage,
  ) {
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
      .filter((f) => f.endsWith('.json'))
      .sort((left, right) => left.localeCompare(right));
    const de = await em.findOne(LanguageItem, { handle: 'de' });
    const en = await em.findOne(LanguageItem, { handle: 'en' });
    let skippedScripts = 0;

    for (const scriptFile of scriptFiles) {
      const scriptName = scriptFile;
      const alreadyRun = await em.findOne(SeedScriptItem, {
        scriptName,
        entityHandle,
        isSuccess: true,
      });
      if (alreadyRun) {
        skippedScripts += 1;
        continue;
      }
      const filePath = path.join(scriptsDir, scriptFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as TranslationFileItem[];
      global.log.info(
        `Seeding ${entityHandle} from script ${scriptName}: ${data.length} records.`,
      );
      try {
        if (de) {
          await this.upsertTranslations(em, data, 'de', de);
        }
        if (en) {
          await this.upsertTranslations(em, data, 'en', en);
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
        global.log.error(
          `Script ${scriptName} for ${entityHandle} failed: ${getErrorMessage(err)}`,
        );

        if (em.isInTransaction()) {
          throw err;
        }

        const statusItem = new SeedScriptItem();
        statusItem.scriptName = scriptName;
        statusItem.entityHandle = entityHandle;
        statusItem.executedAt = new Date();
        statusItem.isSuccess = false;
        await em.persist(statusItem).flush();
        throw err;
      }
    }

    if (skippedScripts > 0) {
      global.log.info(
        `Skipped ${skippedScripts} already executed seed script(s) for ${entityHandle}.`,
      );
    }
  }

  private async upsertTranslations(
    em: EntityManager,
    data: TranslationFileItem[],
    lang: TranslationLanguage,
    language: LanguageItem,
  ): Promise<void> {
    const existingTranslations = await em.find(TranslationItem, { language });
    const existingByKey = new Map(
      existingTranslations.map((translation) => [
        this.buildTranslationKey(translation.entity, translation.property),
        translation,
      ]),
    );

    for (const t of this.filterUniqueTranslations(data, lang)) {
      const existingTranslation = existingByKey.get(
        this.buildTranslationKey(t.entity, t.property),
      );
      if (existingTranslation) {
        existingTranslation.value = t[lang];
        continue;
      }

      em.create(TranslationItem, {
        entity: t.entity,
        property: t.property,
        value: t[lang],
        language,
      });
    }
  }

  private buildTranslationKey(entity: string, property: string): string {
    return `${entity}|${property}`;
  }
}
