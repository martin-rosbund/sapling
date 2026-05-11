// Seeder for populating the database with initial permission data.
import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { EntityItem } from '../../entity/EntityItem';
import { RoleItem } from '../../entity/RoleItem';
import { PermissionItem } from '../../entity/PermissionItem';
import {
  PermissionMatrix,
  createMatrix,
  supportPermissionsInput,
  salesPermissionsInput,
  customerPermissionsInput,
  contractorPermissionsInput,
} from './permission-matrices';
import { ROLE_HANDLE } from './role-handles';

type PermissionGrant = {
  allowRead: boolean;
  allowInsert: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
  allowShow: boolean;
};

const DENY_ALL: PermissionGrant = {
  allowRead: false,
  allowInsert: false,
  allowUpdate: false,
  allowDelete: false,
  allowShow: false,
};

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Seeder for populating the database with initial permission data. Creates missing permissions for all entities and roles.
 *
 * Uses a `Map<roleHandle, PermissionMatrix>` so adding/changing roles only
 * requires touching {@link ROLE_HANDLE} + ./permission-matrices.ts.
 */
export class PermissionSeeder extends Seeder {
  private readonly matricesByRole: Map<number, PermissionMatrix> = new Map([
    [ROLE_HANDLE.SUPPORT, createMatrix(supportPermissionsInput)],
    [ROLE_HANDLE.SALES, createMatrix(salesPermissionsInput)],
    [ROLE_HANDLE.CUSTOMER, createMatrix(customerPermissionsInput)],
    [ROLE_HANDLE.CONTRACTOR, createMatrix(contractorPermissionsInput)],
  ]);

  async run(em: EntityManager): Promise<void> {
    const entities = await em.findAll(EntityItem, { populate: ['group'] });
    const roles = await em.findAll(RoleItem);
    const existingPermissions = await em.findAll(PermissionItem, {
      populate: ['entity', 'role'],
    });

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

        const nextPermission = this.getPermissionsForRole(
          entity,
          role.handle ?? 0,
        );

        em.create(PermissionItem, {
          ...nextPermission,
          entity,
          role,
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await em.flush();
    }
  }

  /**
   * Returns the permission grant for a single (entity, role) combination.
   *
   * - The admin role ({@link ROLE_HANDLE.ADMIN}) inherits the entity's own
   *   `canRead/canInsert/...` flags (full power).
   * - Known roles use their matrix from `matricesByRole`.
   * - Unknown roles default to `DENY_ALL`.
   */
  private getPermissionsForRole(
    entity: EntityItem,
    roleHandle: number,
  ): PermissionGrant {
    if (roleHandle === ROLE_HANDLE.ADMIN) {
      return {
        allowRead: true,
        allowInsert: entity.canInsert,
        allowUpdate: entity.canUpdate,
        allowDelete: entity.canDelete,
        allowShow: entity.canShow,
      };
    }

    const matrix = this.matricesByRole.get(roleHandle);
    if (!matrix) {
      return DENY_ALL;
    }

    return this.resolveMatrixPermission(entity, matrix);
  }

  private resolveMatrixPermission(
    entity: EntityItem,
    matrix: PermissionMatrix,
  ): PermissionGrant {
    return {
      allowRead: entity.canRead === false || matrix.read.has(entity.handle),
      allowInsert: entity.canInsert && matrix.insert.has(entity.handle),
      allowUpdate: entity.canUpdate && matrix.update.has(entity.handle),
      allowDelete: entity.canDelete && matrix.delete.has(entity.handle),
      allowShow: entity.canShow && matrix.show.has(entity.handle),
    };
  }
}
