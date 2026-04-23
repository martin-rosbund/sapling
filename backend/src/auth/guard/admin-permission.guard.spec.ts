import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { PersonItem } from '../../entity/PersonItem';
import { AdminPermission } from '../admin-permission';
import { AdminPermissionGuard } from './admin-permission.guard';

type MockRequest = Request & {
  method: string;
  path: string;
  user?: PersonItem;
};

const createRequest = (
  overrides: Partial<Pick<MockRequest, 'method' | 'path' | 'user'>>,
): MockRequest =>
  ({
    method: 'GET',
    path: '/api/system/cpu',
    ...overrides,
  }) as MockRequest;

type AdminPermissionTestController = {
  constructor: new (...args: never[]) => unknown;
  [key: string]: unknown;
};

class DefaultController {
  open(this: void) {
    return true;
  }
}

@AdminPermission()
class AdminController {
  open(this: void) {
    return true;
  }

  @AdminPermission(false)
  override(this: void) {
    return true;
  }
}

const createExecutionContext = (
  request: MockRequest,
  controller?: AdminPermissionTestController,
  methodName?: string,
): ExecutionContext => {
  const handler =
    controller && methodName && typeof controller[methodName] === 'function'
      ? (controller[methodName] as () => unknown)
      : DefaultController.prototype.open;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => controller?.constructor ?? DefaultController,
  } as unknown as ExecutionContext;
};

const createUser = (isAdministrator: boolean[]): PersonItem =>
  ({
    roles: isAdministrator.map((value) => ({
      isAdministrator: value,
    })),
  }) as unknown as PersonItem;

describe('AdminPermissionGuard', () => {
  const guard = new AdminPermissionGuard(new Reflector());
  const adminController =
    new AdminController() as unknown as AdminPermissionTestController;

  it('allows authenticated administrators to access protected system endpoints', () => {
    const context = createExecutionContext(
      createRequest({ user: createUser([false, true]) }),
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects authenticated users without an administrator role', () => {
    const context = createExecutionContext(
      createRequest({ user: createUser([false]) }),
    );

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('keeps the system state endpoint publicly accessible', () => {
    const context = createExecutionContext(
      createRequest({ path: '/api/system/state' }),
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows explicitly configured admin-protected controllers', () => {
    const context = createExecutionContext(
      createRequest({ user: createUser([true]) }),
      adminController,
      'open',
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('prefers method admin metadata over controller metadata', () => {
    const context = createExecutionContext(
      createRequest({ user: createUser([false]) }),
      adminController,
      'override',
    );

    expect(guard.canActivate(context)).toBe(true);
  });
});
