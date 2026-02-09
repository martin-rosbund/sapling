// Seeder for populating the database with initial permission data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from '../../entity/EntityItem';
import { RoleItem } from '../../entity/RoleItem';
import { PermissionItem } from '../../entity/PermissionItem';
import { DB_DATA_SEEDER } from 'src/constants/project.constants';
import { SeedScriptItem } from 'src/entity/SeedScriptItem';
import fs from 'fs';
import path from 'path';

export class PermissionSeeder extends Seeder {
  /**
   * Runs the permission seeder. If there are no permissions, it creates default permissions for all entities and roles.
   */
  async run(em: EntityManager): Promise<void> {
    const entityName = 'permission';
    const scriptsDir = path.join(__dirname, `./json-${DB_DATA_SEEDER}/${entityName}`);
    if (!fs.existsSync(scriptsDir)) {
      global.log.warn(`No scripts directory found for ${entityName}: ${scriptsDir}`);
      return;
    }
    const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.json'));
    for (const scriptFile of scriptFiles) {
      const scriptName = scriptFile;
      const alreadyRun = await em.findOne(SeedScriptItem, { scriptName, entityName });
      if (alreadyRun) {
        global.log.info(`Script ${scriptName} for ${entityName} already executed at ${alreadyRun['executedAt'] ? new Date(alreadyRun['executedAt']).toISOString() : 'unknown'}. Skipping.`);
        continue;
      }
      // Die eigentliche Logik bleibt erhalten, wird aber pro Script ausgeführt
      try {
        const entities = await em.findAll(EntityItem, { populate : ['group'] });
        const roles = await em.findAll(RoleItem);
        for (const entity of entities) {
          for (const role of roles) {
            switch(role.handle ?? 0){
              case 1:
                em.create(PermissionItem, {
                  allowRead: true,
                  allowInsert: true,
                  allowUpdate: true,
                  allowDelete: true,
                  allowShow: true,
                  entity: entity,
                  role: role,
                });
                break;
              case 2:
                em.create(PermissionItem, {
                  allowRead: !entity.canRead || ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  allowInsert: ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  allowUpdate: ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  allowDelete: ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  allowShow: ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  entity: entity,
                  role: role,
                });
                break;
              case 3:
                em.create(PermissionItem, {
                  allowRead: !entity.canRead || ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  allowInsert: false,
                  allowUpdate: false,
                  allowDelete: false,
                  allowShow: ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  entity: entity,
                  role: role,
                });
                break;
              default:
                em.create(PermissionItem, {
                  allowRead: !entity.canRead || ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  allowInsert: false,
                  allowUpdate: false,
                  allowDelete: false,
                  allowShow: ['masterdata', 'processing'].includes(entity.group?.handle ?? ''),
                  entity: entity,
                  role: role,
                });
            }
          }
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
}
