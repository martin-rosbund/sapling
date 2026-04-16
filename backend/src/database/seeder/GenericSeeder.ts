// Generic seeder for any entity type
import { EntityManager } from '@mikro-orm/core';
import type { EntityName } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { SeedScriptItem } from '../../entity/SeedScriptItem';
import { DB_DATA_SEEDER } from '../../constants/project.constants';
import fs from 'fs';
import path from 'path';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Generic seeder for any entity type. Handles seeding of entities from JSON scripts, tracks execution status, and logs results.
 *
 * @property        {any}                   entityClass         The entity class to seed (static)
 * @property        {string}                entityHandle          The name of the entity to seed (static)
 *
 * @method          run                     Executes seeding for the specified entity, loading JSON scripts, checking execution status, and persisting new records.
 * @method          for                     Static factory method to create a seeder for a given entity class.
 */
export class GenericSeeder extends Seeder {
  /**
   * The entity class to seed (static).
   * @type {any}
   */
  static entityClass: unknown;

  /**
   * The name of the entity to seed (static).
   * @type {string}
   */
  static entityHandle: string;

  private static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Executes seeding for the specified entity.
   * Loads JSON scripts, checks if already executed, creates new records, and logs results.
   * @param {EntityManager} em - MikroORM entity manager
   * @returns {Promise<void>}
   */
  async run(em: EntityManager): Promise<void> {
    const entityClass = (this.constructor as typeof GenericSeeder)
      .entityClass as EntityName<object>;
    const entityHandle = (this.constructor as typeof GenericSeeder)
      .entityHandle;

    // Find all script files for this entity
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

    for (const scriptFile of scriptFiles) {
      const scriptName = scriptFile;
      // Prüfe Status
      const alreadyRun = await em.findOne(SeedScriptItem, {
        scriptName,
        entityHandle,
        isSuccess: true,
      });
      if (alreadyRun) {
        global.log.info(
          `Script ${scriptName} for ${entityHandle} already executed at ${alreadyRun.executedAt?.toISOString() ?? 'unknown'}. Skipping.`,
        );
        continue;
      }
      // Lade Daten
      const filePath = path.join(scriptsDir, scriptFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as object[];
      global.log.info(
        `Seeding ${entityHandle} from script ${scriptName}: ${data.length} records.`,
      );
      try {
        for (const item of data) {
          em.create(entityClass, item);
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
          `Script ${scriptName} for ${entityHandle} failed: ${GenericSeeder.getErrorMessage(err)}`,
        );
      }
    }
  }

  /**
   * Static factory method to create a seeder for a given entity class.
   * @param {new (...args: any[]) => E} entityClass - The entity class constructor
   * @returns {typeof GenericSeeder} - A seeder class for the entity
   */
  static for<E extends object>(
    entityClass: EntityName<E>,
  ): typeof GenericSeeder {
    const found = ENTITY_REGISTRY.find((e) => e.class === entityClass);
    if (!found) {
      throw new Error('global.entityNotFound');
    }
    class EntitySeeder extends GenericSeeder {}
    EntitySeeder.entityClass = entityClass;
    EntitySeeder.entityHandle = found.name;
    return EntitySeeder;
  }
}
