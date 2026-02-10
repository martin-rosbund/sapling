// Generic seeder for any entity type
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { SeedScriptItem } from 'src/entity/SeedScriptItem';
import { DB_DATA_SEEDER } from 'src/constants/project.constants';
import fs from 'fs';
import path from 'path';

export class GenericSeeder extends Seeder {
  static entityClass: any;
  static entityName: string;

  async run(em: EntityManager): Promise<void> {
    const entityClass = (this.constructor as typeof GenericSeeder).entityClass;
    const entityName = (this.constructor as typeof GenericSeeder).entityName;

    // Find all script files for this entity
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

    for (const scriptFile of scriptFiles) {
      const scriptName = scriptFile;
      // Prüfe Status
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
      // Lade Daten
      const filePath = path.join(scriptsDir, scriptFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as any[];
      global.log.info(
        `Seeding ${entityName} from script ${scriptName}: ${data.length} records.`,
      );
      try {
        for (const item of data) {
          em.create(entityClass, item as object);
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

  static for<E>(entityClass: new (...args: any[]) => E): typeof GenericSeeder {
    const found = ENTITY_REGISTRY.find((e) => e.class === entityClass);
    if (!found) {
      throw new Error('global.entityNotFound');
    }
    class EntitySeeder extends GenericSeeder {}
    EntitySeeder.entityClass = entityClass;
    EntitySeeder.entityName = found.name;
    return EntitySeeder;
  }
}
