// Seeder for populating the database with initial permission data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from '../../entity/EntityItem';
import { RoleItem } from '../../entity/RoleItem';
import { PermissionItem } from '../../entity/PermissionItem';

export class PermissionSeeder extends Seeder {
  /**
   * Runs the permission seeder. If there are no permissions, it creates default permissions for all entities and roles.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(PermissionItem);
    const entities = await em.findAll(EntityItem, { populate : ['group'] });
    const roles = await em.findAll(RoleItem);

    if (count === 0) {
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
    }
  }
}
