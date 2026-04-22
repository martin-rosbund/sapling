import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { EntityManager } from '@mikro-orm/core';
import type { Request } from 'express';
import type { PersonItem } from '../../entity/PersonItem';
import { KpiController } from '../kpi/kpi.controller';
import { MailController } from '../mail/mail.controller';
import { ScriptController } from '../script/script.controller';
import { TemplateController } from '../template/template.controller';
import { WebhookController } from '../webhook/webhook.controller';
import type { GenericPermissionAction } from './generic.decorator';
import { GenericPermissionGuard } from './generic-permission.guard';

jest.mock('@mikro-orm/core', () => ({ EntityManager: class {} }));
jest.mock('../kpi/kpi.service', () => ({ KpiService: class {} }));
jest.mock('../kpi/dto/kpi-response.dto', () => ({ KpiResponseDto: class {} }));
jest.mock('../mail/mail.service', () => ({ MailService: class {} }));
jest.mock('../mail/dto/mail.dto', () => ({
  MailPreviewDto: class {},
  MailPreviewResponseDto: class {},
  MailSendDto: class {},
}));
jest.mock('../script/script.service', () => ({
  ScriptService: class {},
  ScriptMethods: {
    beforeRead: 0,
    afterRead: 1,
    beforeUpdate: 2,
    afterUpdate: 3,
    beforeInsert: 4,
    afterInsert: 5,
    beforeDelete: 6,
    afterDelete: 7,
  },
}));
jest.mock('../template/dto/entity-template.dto', () => ({
  EntityTemplateDto: class {},
}));
jest.mock('../template/template.service', () => ({
  TemplateService: class {},
}));
jest.mock('../webhook/webhook.service', () => ({ WebhookService: class {} }));
jest.mock('../../auth/session-or-token-auth.guard', () => ({
  SessionOrBearerAuthGuard: class {},
}));
jest.mock('../../entity/EmailDeliveryItem', () => ({
  EmailDeliveryItem: class {},
}));
jest.mock('../../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../../entity/KpiItem', () => ({ KpiItem: class {} }));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/WebhookDeliveryItem', () => ({
  WebhookDeliveryItem: class {},
}));
jest.mock('../../entity/WebhookSubscriptionItem', () => ({
  WebhookSubscriptionItem: class {},
}));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_HANDLES: ['contract', 'salesOpportunity'],
  ENTITY_REGISTRY: [],
}));

type MockPermission = {
  entity: { handle: string };
  allowRead?: boolean;
  allowInsert?: boolean;
  allowUpdate?: boolean;
  allowDelete?: boolean;
};

type MockRequest = Request & {
  method: string;
  params: Record<string, string>;
  body: Record<string, unknown>;
  user?: PersonItem;
};

type HandlerOwner = {
  constructor: new (...args: never[]) => unknown;
} & Record<string, unknown>;

const createPermission = (
  entityHandle: string,
  action: GenericPermissionAction,
): MockPermission => ({
  entity: { handle: entityHandle },
  allowRead: action === 'allowRead',
  allowInsert: action === 'allowInsert',
  allowUpdate: action === 'allowUpdate',
  allowDelete: action === 'allowDelete',
});

const createUser = (...permissions: MockPermission[]): PersonItem =>
  ({
    handle: 1,
    username: 'tester',
    roles: [{ permissions }],
  }) as unknown as PersonItem;

const createRequest = (
  overrides: Partial<Pick<MockRequest, 'method' | 'params' | 'body' | 'user'>>,
): MockRequest =>
  ({
    method: 'GET',
    params: {},
    body: {},
    ...overrides,
  }) as MockRequest;

const createExecutionContext = (
  controller: HandlerOwner,
  methodName: string,
  request: MockRequest,
): ExecutionContext => {
  const handler = controller[methodName];

  if (typeof handler !== 'function') {
    throw new Error(`Handler ${methodName} is not a function`);
  }

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => controller.constructor,
  } as ExecutionContext;
};

const createGuard = (findOne?: EntityManager['findOne']) =>
  new GenericPermissionGuard(new Reflector(), {
    findOne: findOne ?? jest.fn(),
  } as unknown as EntityManager);

describe('GenericPermissionGuard entity resolvers', () => {
  it('allows template access only for explicitly permitted entities', async () => {
    const controller = new TemplateController({
      getEntityTemplate: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const guard = createGuard();
    const allowedContext = createExecutionContext(
      controller,
      'getEntityTemplate',
      createRequest({
        method: 'GET',
        params: { entityHandle: 'contract' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'getEntityTemplate',
      createRequest({
        method: 'GET',
        params: { entityHandle: 'salesOpportunity' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('allows mail preview only for entities the user may read', async () => {
    const controller = new MailController({
      previewEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const guard = createGuard();
    const allowedContext = createExecutionContext(
      controller,
      'preview',
      createRequest({
        method: 'POST',
        body: { entityHandle: 'contract' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'preview',
      createRequest({
        method: 'POST',
        body: { entityHandle: 'salesOpportunity' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('requires update permission for sending mail on the resolved entity', async () => {
    const controller = new MailController({
      previewEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const guard = createGuard();
    const allowedContext = createExecutionContext(
      controller,
      'send',
      createRequest({
        method: 'POST',
        body: { entityHandle: 'contract' },
        user: createUser(createPermission('contract', 'allowUpdate')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'send',
      createRequest({
        method: 'POST',
        body: { entityHandle: 'contract' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('restricts client-side scripts by the entity from the request body', async () => {
    const controller = new ScriptController({
      runClient: jest.fn(),
      runServer: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const guard = createGuard();
    const allowedContext = createExecutionContext(
      controller,
      'runClient',
      createRequest({
        method: 'POST',
        body: { entity: { handle: 'contract' } },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'runClient',
      createRequest({
        method: 'POST',
        body: { entity: { handle: 'salesOpportunity' } },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('maps server-side script methods to the matching permission on the same entity', async () => {
    const controller = new ScriptController({
      runClient: jest.fn(),
      runServer: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const guard = createGuard();
    const allowedContext = createExecutionContext(
      controller,
      'runServer',
      createRequest({
        method: 'POST',
        body: {
          entity: { handle: 'contract' },
          method: 'beforeUpdate',
        },
        user: createUser(createPermission('contract', 'allowUpdate')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'runServer',
      createRequest({
        method: 'POST',
        body: {
          entity: { handle: 'contract' },
          method: 'beforeUpdate',
        },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('resolves KPI target entities before checking read permission', async () => {
    const controller = new KpiController({
      executeKPIById: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const findOne = jest.fn((_entity, where) => {
      const handle = Number((where as { handle: number }).handle);

      return Promise.resolve(
        handle === 11
          ? { targetEntity: { handle: 'contract' } }
          : { targetEntity: { handle: 'salesOpportunity' } },
      );
    }) as unknown as EntityManager['findOne'];
    const guard = createGuard(findOne);
    const allowedContext = createExecutionContext(
      controller,
      'executeKPI',
      createRequest({
        method: 'GET',
        params: { handle: '11' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'executeKPI',
      createRequest({
        method: 'GET',
        params: { handle: '12' },
        user: createUser(createPermission('contract', 'allowRead')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('restricts webhook triggers to subscriptions for permitted entities', async () => {
    const controller = new WebhookController({
      querySubscription: jest.fn(),
      retryDelivery: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const findOne = jest.fn((_entity, where) => {
      const handle = Number((where as { handle: number }).handle);

      return Promise.resolve({
        entity: {
          handle: handle === 21 ? 'contract' : 'salesOpportunity',
        },
      });
    }) as unknown as EntityManager['findOne'];
    const guard = createGuard(findOne);
    const allowedContext = createExecutionContext(
      controller,
      'triggerWebhook',
      createRequest({
        method: 'POST',
        params: { handle: '21' },
        body: { payload: { handle: 1 } },
        user: createUser(createPermission('contract', 'allowUpdate')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'triggerWebhook',
      createRequest({
        method: 'POST',
        params: { handle: '22' },
        body: { payload: { handle: 1 } },
        user: createUser(createPermission('contract', 'allowUpdate')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });

  it('restricts webhook retries to deliveries for permitted entities', async () => {
    const controller = new WebhookController({
      querySubscription: jest.fn(),
      retryDelivery: jest.fn(),
    } as never) as unknown as HandlerOwner;
    const findOne = jest.fn((_entity, where) => {
      const handle = Number((where as { handle: number }).handle);

      return Promise.resolve({
        subscription: {
          entity: {
            handle: handle === 31 ? 'contract' : 'salesOpportunity',
          },
        },
      });
    }) as unknown as EntityManager['findOne'];
    const guard = createGuard(findOne);
    const allowedContext = createExecutionContext(
      controller,
      'retryDelivery',
      createRequest({
        method: 'POST',
        params: { handle: '31' },
        user: createUser(createPermission('contract', 'allowUpdate')),
      }),
    );
    const deniedContext = createExecutionContext(
      controller,
      'retryDelivery',
      createRequest({
        method: 'POST',
        params: { handle: '32' },
        user: createUser(createPermission('contract', 'allowUpdate')),
      }),
    );

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
    await expect(guard.canActivate(deniedContext)).rejects.toThrow(
      new ForbiddenException('global.permissionDenied'),
    );
  });
});
