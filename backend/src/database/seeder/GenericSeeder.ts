// Generic seeder for any entity type
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { SeedScriptItem } from 'src/entity/SeedScriptItem';
import { DB_DATA_SEEDER } from 'src/constants/project.constants';
import fs from 'fs';
import path from 'path';

export class GenericSeeder<T> extends Seeder {
  static entity: any;
  static entityName: string;

  async run(em: EntityManager): Promise<void> {
    const entity = (this.constructor as typeof GenericSeeder).entity;
    const entityName = (this.constructor as typeof GenericSeeder).entityName;

    // Find all script files for this entity
    const scriptsDir = path.join(__dirname, `./json-${DB_DATA_SEEDER}/${entityName}`);
    if (!fs.existsSync(scriptsDir)) {
      global.log.warn(`No scripts directory found for ${entityName}: ${scriptsDir}`);
      return;
    }
    const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.json'));

    for (const scriptFile of scriptFiles) {
      const scriptName = scriptFile;
      // Prüfe Status
      const SeedScriptStatusItem = require('../../entity/SeedScriptStatusItem').SeedScriptStatusItem;
      const alreadyRun = await em.findOne(SeedScriptStatusItem, { scriptName, entityName });
      if (alreadyRun) {
        global.log.info(`Script ${scriptName} for ${entityName} already executed at ${alreadyRun['executedAt'] ? new Date(alreadyRun['executedAt']).toISOString() : 'unknown'}. Skipping.`);
        continue;
      }
      // Lade Daten
      const filePath = path.join(scriptsDir, scriptFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      global.log.info(`Seeding ${entityName} from script ${scriptName}: ${data.length} records.`);
      try {
        for (const item of data) {
          em.create(entity, item as object);
        }
        await em.flush();
        const statusItem = new SeedScriptItem();
        statusItem.scriptName = scriptName;
        statusItem.entityName = entityName;
        statusItem.executedAt = new Date();
        statusItem.status = 'success';
        await em.persist(statusItem).flush();
        global.log.info(`Script ${scriptName} for ${entityName} executed successfully.`);
      } catch (err) {
        const statusItem = new SeedScriptItem();
        statusItem.scriptName = scriptName;
        statusItem.entityName = entityName;
        statusItem.executedAt = new Date();
        statusItem.status = 'failed';
        await em.persist(statusItem).flush();
        global.log.error(`Script ${scriptName} for ${entityName} failed: ${err}`);
      }
    }
  }

  static for<E>(entity: new (...args: any[]) => E): typeof GenericSeeder {
    const found = ENTITY_REGISTRY.find((e) => e.class === entity);
    if (!found) {
      throw new Error('global.entityNotFound');
    }
    class EntitySeeder extends GenericSeeder<E> {}
    EntitySeeder.entity = entity;
    EntitySeeder.entityName = found.name;
    return EntitySeeder;
  }
}
