// Seeder for populating the database with initial permission data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from 'src/entity/EntityItem';
import { RoleItem } from 'src/entity/RoleItem';
import { PermissionItem } from 'src/entity/PermissionItem';

export class PermissionSeeder extends Seeder {
  /**
   * Runs the permission seeder. If there are no permissions, it creates default permissions for all entities and roles.
   */
  async run(em: EntityManager): Promise<void> {
    const count = await em.count(PermissionItem);
    const entities = await em.findAll(EntityItem);
    const roles = await em.findAll(RoleItem);

    if (count === 0) {
      for (const entity of entities) {
        for (const role of roles) {
          em.create(PermissionItem, {
            allowRead: true,
            allowInsert: true,
            allowUpdate: true,
            allowDelete: true,
            allowShow: true,
            entity: entity,
            role: role,
          });
        }
      }
    }
  }
}
