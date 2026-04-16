import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentController } from './current/current.controller';
import { GenericController } from './generic/generic.controller';
import { GithubController } from './github/github.controller';
import { KpiController } from './kpi/kpi.controller';
import { SystemController } from './system/system.controller';
import { TemplateController } from './template/template.controller';
import type { PersonItem } from '../entity/PersonItem';

const createMockUser = (): PersonItem =>
  ({
    handle: 1,
    username: 'tester',
  }) as PersonItem;

const createMockResponse = (): Response =>
  ({
    setHeader: jest.fn(),
    send: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('GenericController', () => {
  it('returns paginated entity data', async () => {
    const expected = { items: [{ handle: 1 }], total: 1 };
    const genericService = {
      findAndCount: jest.fn(async () => expected),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };
    const query = {
      page: 2,
      limit: 5,
      filter: '{"active":true}',
      orderBy: '{"name":"ASC"}',
      relations: ['person'],
    };

    await expect(
      controller.findPaginated(req as never, 'ticket', query),
    ).resolves.toBe(expected);
    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'ticket',
      query.filter,
      query.page,
      query.limit,
      query.orderBy,
      req.user,
      query.relations,
    );
  });

  it('downloads entity data as JSON', async () => {
    const genericService = {
      downloadJSON: jest.fn(async () => '[{"handle":1}]'),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };
    const res = createMockResponse();

    await controller.download(req as never, res, 'ticket', {
      filter: '{"active":true}',
      orderBy: '{"name":"ASC"}',
      relations: ['person'],
    });

    expect(genericService.downloadJSON).toHaveBeenCalledWith(
      'ticket',
      '{"active":true}',
      '{"name":"ASC"}',
      req.user,
      ['person'],
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-Type',
      'application/json',
    );
    expect(res.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-Disposition',
      'attachment; filename="ticket.json"',
    );
    expect(res.send).toHaveBeenCalledWith('[{"handle":1}]');
  });

  it('creates an entity entry', async () => {
    const expected = { handle: 3 };
    const genericService = {
      create: jest.fn(async () => expected),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };
    const payload = { title: 'New ticket' };

    await expect(
      controller.create(req as never, 'ticket', payload),
    ).resolves.toBe(expected);
    expect(genericService.create).toHaveBeenCalledWith('ticket', payload, req.user);
  });

  it('updates an entity entry', async () => {
    const expected = { handle: 3, title: 'Updated ticket' };
    const genericService = {
      update: jest.fn(async () => expected),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };
    const payload = { title: 'Updated ticket' };

    await expect(
      controller.update(
        req as never,
        'ticket',
        '3',
        { relations: ['person'] },
        payload,
      ),
    ).resolves.toBe(expected);
    expect(genericService.update).toHaveBeenCalledWith(
      'ticket',
      '3',
      payload,
      req.user,
      ['person'],
    );
  });

  it('deletes an entity entry', async () => {
    const genericService = {
      delete: jest.fn(async () => undefined),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };

    await expect(
      controller.delete(req as never, 'ticket', '3'),
    ).resolves.toBeUndefined();
    expect(genericService.delete).toHaveBeenCalledWith('ticket', '3', req.user);
  });

  it('creates a reference for an entity entry', async () => {
    const expected = { success: true };
    const genericService = {
      createReference: jest.fn(async () => expected),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };

    await expect(
      controller.createReference(req as never, 'ticket', 'persons', {
        entityHandle: '3',
        referenceHandle: '8',
      }),
    ).resolves.toBe(expected);
    expect(genericService.createReference).toHaveBeenCalledWith(
      'ticket',
      'persons',
      '3',
      '8',
      req.user,
    );
  });

  it('deletes a reference from an entity entry', async () => {
    const expected = { success: true };
    const genericService = {
      deleteReference: jest.fn(async () => expected),
    };
    const controller = new GenericController(genericService as never);
    const req = { user: createMockUser() };

    await expect(
      controller.deleteReference(req as never, 'ticket', 'persons', {
        entityHandle: '3',
        referenceHandle: '8',
      }),
    ).resolves.toBe(expected);
    expect(genericService.deleteReference).toHaveBeenCalledWith(
      'ticket',
      'persons',
      '3',
      '8',
      req.user,
    );
  });
});

describe('CurrentController', () => {
  it('returns the hydrated current person when available', async () => {
    const hydratedUser = { handle: 1, username: 'hydrated' } as PersonItem;
    const currentService = {
      getPerson: jest.fn(async () => hydratedUser),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(controller.getPerson(req as never)).resolves.toBe(hydratedUser);
    expect(currentService.getPerson).toHaveBeenCalledWith(req.user);
  });

  it('falls back to the request user when no hydrated current person exists', async () => {
    const currentService = {
      getPerson: jest.fn(async () => null),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(controller.getPerson(req as never)).resolves.toBe(req.user);
  });

  it('changes the current user password', async () => {
    const currentService = {
      changePassword: jest.fn(async () => undefined),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(
      controller.changePassword(req as never, 'secret', 'secret'),
    ).resolves.toBeUndefined();
    expect(currentService.changePassword).toHaveBeenCalledWith(req.user, 'secret');
  });

  it('rejects password changes when fields are missing', async () => {
    const controller = new CurrentController({} as never);

    await expect(
      controller.changePassword({ user: createMockUser() } as never, '', ''),
    ).rejects.toThrow(new BadRequestException('login.passwordRequired'));
  });

  it('rejects password changes when passwords do not match', async () => {
    const controller = new CurrentController({} as never);

    await expect(
      controller.changePassword({ user: createMockUser() } as never, 'a', 'b'),
    ).rejects.toThrow(new BadRequestException('login.passwordsDoNotMatch'));
  });

  it('returns open tickets for the current user', async () => {
    const tickets = [{ handle: 1 }];
    const currentService = {
      getOpenTickets: jest.fn(async () => tickets),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(controller.getOpenTickets(req as never)).resolves.toBe(tickets);
    expect(currentService.getOpenTickets).toHaveBeenCalledWith(req.user);
  });

  it('returns open events for the current user', async () => {
    const events = [{ handle: 1 }];
    const currentService = {
      getOpenEvents: jest.fn(async () => events),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(controller.getOpenEvents(req as never)).resolves.toBe(events);
    expect(currentService.getOpenEvents).toHaveBeenCalledWith(req.user);
  });

  it('counts open tasks for the current user', async () => {
    const count = { count: 4 };
    const currentService = {
      countOpenTasks: jest.fn(async () => count),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(controller.countOpenTasks(req as never)).resolves.toBe(count);
    expect(currentService.countOpenTasks).toHaveBeenCalledWith(req.user);
  });

  it('returns all entity permissions for the current user', () => {
    const permissions = [{ entityHandle: 'ticket' }];
    const currentService = {
      getAllEntityPermissions: jest.fn(() => permissions),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    expect(controller.getAllEntityPermissions(req as never)).toBe(permissions);
    expect(currentService.getAllEntityPermissions).toHaveBeenCalledWith(req.user);
  });

  it('returns permissions for a specific entity', () => {
    const permission = { entityHandle: 'ticket' };
    const currentService = {
      getEntityPermissions: jest.fn(() => permission),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    expect(controller.getEntityPermission(req as never, 'ticket')).toBe(permission);
    expect(currentService.getEntityPermissions).toHaveBeenCalledWith(
      req.user,
      'ticket',
    );
  });

  it('rejects entity permission lookups without an entity handle', () => {
    const controller = new CurrentController({} as never);

    expect(() =>
      controller.getEntityPermission(
        { user: createMockUser() } as never,
        '',
      ),
    ).toThrow(new BadRequestException('global.entityHandleRequired'));
  });

  it('returns the configured work week for the current user', async () => {
    const workWeek = { handle: 1 };
    const currentService = {
      getWorkWeek: jest.fn(async () => workWeek),
    };
    const controller = new CurrentController(currentService as never);
    const req = { user: createMockUser() };

    await expect(controller.getWorkWeek(req as never)).resolves.toBe(workWeek);
    expect(currentService.getWorkWeek).toHaveBeenCalledWith(req.user);
  });
});

describe('TemplateController', () => {
  it('returns entity template metadata', () => {
    const template = [{ property: 'name' }];
    const templateService = {
      getEntityTemplate: jest.fn(() => template),
    };
    const controller = new TemplateController(templateService as never);

    expect(controller.getEntityTemplate('ticket')).toBe(template);
    expect(templateService.getEntityTemplate).toHaveBeenCalledWith('ticket');
  });
});

describe('GithubController', () => {
  it('returns repository information', async () => {
    const repository = { name: 'sapling' };
    const githubService = {
      getRepository: jest.fn(async () => repository),
      getReleases: jest.fn(),
      getIssues: jest.fn(),
    };
    const controller = new GithubController(githubService as never);

    await expect(controller.getRepository()).resolves.toBe(repository);
  });

  it('returns releases', async () => {
    const releases = [{ tag: 'v1.0.0' }];
    const githubService = {
      getRepository: jest.fn(),
      getReleases: jest.fn(async () => releases),
      getIssues: jest.fn(),
    };
    const controller = new GithubController(githubService as never);

    await expect(controller.getReleases()).resolves.toBe(releases);
  });

  it('returns issues using the default status', async () => {
    const issues = [{ handle: 1 }];
    const githubService = {
      getRepository: jest.fn(),
      getReleases: jest.fn(),
      getIssues: jest.fn(async () => issues),
    };
    const controller = new GithubController(githubService as never);

    await expect(controller.getIssues()).resolves.toBe(issues);
    expect(githubService.getIssues).toHaveBeenCalledWith('open');
  });

  it('returns issues using the provided status', async () => {
    const githubService = {
      getRepository: jest.fn(),
      getReleases: jest.fn(),
      getIssues: jest.fn(async () => []),
    };
    const controller = new GithubController(githubService as never);

    await controller.getIssues('closed');

    expect(githubService.getIssues).toHaveBeenCalledWith('closed');
  });
});

describe('KpiController', () => {
  it('executes a KPI by handle', async () => {
    const result = { value: 42 };
    const kpiService = {
      executeKPIById: jest.fn(async () => result),
    };
    const controller = new KpiController(kpiService as never);

    await expect(controller.executeKPI(7)).resolves.toBe(result);
    expect(kpiService.executeKPIById).toHaveBeenCalledWith(7);
  });
});

describe('SystemController', () => {
  const cpuService = {
    getCpu: jest.fn(async () => ({ manufacturer: 'Test CPU' })),
    getCpuSpeed: jest.fn(async () => ({ avg: 3.2 })),
  };
  const memoryService = {
    getMemory: jest.fn(async () => ({ total: 1024 })),
  };
  const filesystemService = {
    getFilesystem: jest.fn(async () => [{ fs: '/' }]),
  };
  const networkService = {
    getNetwork: jest.fn(async () => [{ iface: 'lo' }]),
  };
  const osService = {
    getOs: jest.fn(async () => ({ platform: 'linux' })),
  };
  const timeService = {
    getTime: jest.fn(() => ({ current: 1 })),
  };
  const versionService = {
    getVersion: jest.fn(() => ({ version: '0.0.1' })),
  };

  const controller = new SystemController(
    cpuService as never,
    memoryService as never,
    filesystemService as never,
    networkService as never,
    osService as never,
    timeService as never,
    versionService as never,
  );

  it('returns CPU information', async () => {
    await expect(controller.getCpu()).resolves.toEqual({ manufacturer: 'Test CPU' });
  });

  it('returns CPU speed information', async () => {
    await expect(controller.getCpuSpeed()).resolves.toEqual({ avg: 3.2 });
  });

  it('returns memory information', async () => {
    await expect(controller.getMemory()).resolves.toEqual({ total: 1024 });
  });

  it('returns filesystem information', async () => {
    await expect(controller.getFilesystem()).resolves.toEqual([{ fs: '/' }]);
  });

  it('returns network information', async () => {
    await expect(controller.getNetwork()).resolves.toEqual([{ iface: 'lo' }]);
  });

  it('returns operating system information', async () => {
    await expect(controller.getOs()).resolves.toEqual({ platform: 'linux' });
  });

  it('returns time information', () => {
    expect(controller.getTime()).toEqual({ current: 1 });
  });

  it('returns application version information', () => {
    expect(controller.getVersion()).toEqual({ version: '0.0.1' });
  });

  it('returns the current application state', () => {
    global.isReady = true;

    expect(controller.getState()).toEqual({ isReady: true });

    global.isReady = false;
  });
});
