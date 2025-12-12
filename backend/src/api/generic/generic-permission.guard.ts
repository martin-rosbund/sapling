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

@Injectable()
export class GenericPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as PersonItem;
    const entityName = req.params.entityName;
    const method = req.method;

    // Mapping HTTP method to permission
    const permissionMap: Record<string, keyof PermissionItem> = {
      GET: 'allowRead',
      POST: 'allowInsert',
      PATCH: 'allowUpdate',
      DELETE: 'allowDelete',
    };

    const permissionKey = permissionMap[method];

    for (const role of user?.roles ?? []) {
      for (const permission of role.permissions ?? []) {
        if (
          permission.entity.handle === entityName &&
          permission[permissionKey] === true
        ) {
          return true;
        }
      }
    }

    if (
      method === 'GET' &&
      ['translation', 'entity', 'entityGroup'].includes(entityName)
    ) {
      return true;
    }

    throw new ForbiddenException(`global.permissionDenied`);
  }
}
