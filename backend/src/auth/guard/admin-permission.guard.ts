import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PersonItem } from '../../entity/PersonItem';
import { ADMIN_PERMISSION_KEY } from '../admin-permission';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (req.method === 'GET' && req.path === '/api/system/state') {
      return true;
    }

    const requiresAdmin =
      this.reflector.getAllAndOverride<boolean>(ADMIN_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? true;

    if (!requiresAdmin) {
      return true;
    }

    const user = req.user as PersonItem | undefined;
    if (!user) {
      throw new ForbiddenException('global.permissionDenied');
    }

    for (const role of user.roles ?? []) {
      if (role.isAdministrator === true) {
        return true;
      }
    }

    throw new ForbiddenException('global.permissionDenied');
  }
}
