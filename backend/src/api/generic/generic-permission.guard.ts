import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PersonItem } from '../../entity/PersonItem';
import { PermissionItem } from '../../entity/PermissionItem';
import {
  GENERIC_PERMISSION_KEY,
  GENERIC_PERMISSION_ENTITY_KEY,
  GenericPermissionAction,
} from './generic.decorator';

const PUBLIC_GENERIC_READ_ENTITIES = ['translation', 'entity', 'entityGroup'];

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Guard for generic entity permissions. Checks user roles and permissions for CRUD operations on entities.
 *
 * @property        {Reflector} reflector  Reflector for metadata access
 *
 * @method          canActivate           Checks if the current user has permission for the requested entity and operation
 */
@Injectable()
export class GenericPermissionGuard implements CanActivate {
  /**
   * Creates a new GenericPermissionGuard.
   * @param {Reflector} reflector Reflector for metadata access
   */
  constructor(private reflector: Reflector) {}

  /**
   * Checks if the current user has permission for the requested entity and operation.
   * @param {ExecutionContext} context Execution context
   * @returns {boolean} True if access is allowed, otherwise throws ForbiddenException
   */
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as PersonItem;
    const entityHandle =
      this.reflector.getAllAndOverride<string>(GENERIC_PERMISSION_ENTITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? req.params.entityHandle;
    const method = req.method;

    // Allow GET for translation, entity and entityGroup without authentication.
    if (
      method === 'GET' &&
      PUBLIC_GENERIC_READ_ENTITIES.includes(entityHandle ?? '')
    ) {
      return true;
    }

    if (!user || !entityHandle) {
      throw new ForbiddenException(`global.permissionDenied`);
    }

    // Mapping HTTP method to permission
    const permissionMap: Record<string, keyof PermissionItem> = {
      GET: 'allowRead',
      POST: 'allowInsert',
      PATCH: 'allowUpdate',
      DELETE: 'allowDelete',
    };

    const permissionKey =
      this.reflector.getAllAndOverride<GenericPermissionAction>(
        GENERIC_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? permissionMap[method];

    for (const role of user?.roles ?? []) {
      for (const permission of role.permissions ?? []) {
        if (
          permission.entity.handle === entityHandle &&
          permission[permissionKey] === true
        ) {
          return true;
        }
      }
    }

    throw new ForbiddenException(`global.permissionDenied`);
  }
}
