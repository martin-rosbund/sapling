// Seeder for populating the database with initial permission data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from '../../entity/EntityItem';
import { RoleItem } from '../../entity/RoleItem';
import { PermissionItem } from '../../entity/PermissionItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Seeder for populating the database with initial permission data. Creates default permissions for all entities and roles if none exist.
 *
 * @method          run                     Executes permission seeding, creating default permissions for each entity-role combination.
 */
export class PermissionSeeder extends Seeder {
  /**
   * Runs the permission seeder. If there are no permissions, it creates default permissions for all entities and roles.
   */
  /**
   * Executes permission seeding.
   * If no permissions exist, creates default permissions for all entities and roles.
   * @param {EntityManager} em - MikroORM entity manager
   * @returns {Promise<void>}
   */
  async run(em: EntityManager): Promise<void> {
    const entities = await em.findAll(EntityItem, { populate: ['group'] });
    const roles = await em.findAll(RoleItem);
    const existingPermissions = await em.findAll(PermissionItem, {
      populate: ['entity', 'role'],
    });
    const userPermissions = ['masterdata', 'event', 'ticket', 'sales', 'note'];
    const existingKeys = new Set(
      existingPermissions.map(
        (permission) =>
          `${permission.entity.handle}|${permission.role.handle ?? ''}`,
      ),
    );
    let hasChanges = false;

    for (const entity of entities) {
      for (const role of roles) {
        const key = `${entity.handle}|${role.handle ?? ''}`;
        if (existingKeys.has(key)) {
          continue;
        }

        switch (role.handle ?? 0) {
          case 1:
            em.create(PermissionItem, {
              allowRead: true,
              allowInsert: entity.canInsert,
              allowUpdate: entity.canUpdate,
              allowDelete: entity.canDelete,
              allowShow: entity.canShow,
              entity: entity,
              role: role,
            });
            break;
          case 2:
            em.create(PermissionItem, {
              allowRead:
                !entity.canRead ||
                userPermissions.includes(entity.group?.handle ?? ''),
              allowInsert: userPermissions.includes(entity.group?.handle ?? ''),
              allowUpdate: userPermissions.includes(entity.group?.handle ?? ''),
              allowDelete: userPermissions.includes(entity.group?.handle ?? ''),
              allowShow: userPermissions.includes(entity.group?.handle ?? ''),
              entity: entity,
              role: role,
            });
            break;
          default:
            em.create(PermissionItem, {
              allowRead:
                !entity.canRead ||
                [
                  'company',
                  'person',
                  'contract',
                  'product',
                  'ticket',
                  'ticketPriority',
                  'document',
                  'documentType',
                ].includes(entity.handle ?? ''),
              allowInsert: ['ticket'].includes(entity.handle ?? ''),
              allowUpdate: ['ticket'].includes(entity.handle ?? ''),
              allowDelete: false,
              allowShow: [
                'company',
                'person',
                'contract',
                'product',
                'ticket',
              ].includes(entity.handle ?? ''),
              entity: entity,
              role: role,
            });
            break;
        }

        hasChanges = true;
      }
    }

    if (hasChanges) {
      await em.flush();
    }
  }
}
