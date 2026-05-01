import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/DashboardTemplateItem', () => ({
  DashboardTemplateItem: class {},
}));
jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { DashboardTemplateController } from './DashboardTemplateController';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { DashboardTemplateItem } from '../entity/DashboardTemplateItem';

describe('DashboardTemplateController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('adds the current-user visibility scope to read filters', async () => {
    const controller = new DashboardTemplateController(
      { handle: 'dashboardTemplate' } as never,
      { handle: 42 } as never,
      {} as never,
    );

    const result = await controller.beforeRead([{ name: { $ilike: '%Ops%' } }]);

    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
    expect(result.items).toEqual([
      {
        $and: [
          { name: { $ilike: '%Ops%' } },
          { $or: [{ isShared: true }, { person: 42 }] },
        ],
      },
    ]);
  });

  it('stamps new templates with the current user and normalizes visibility', async () => {
    const items = [
      { name: 'Ops', isShared: 'yes' as unknown as boolean, person: 7 },
    ] as DashboardTemplateItem[];
    const controller = new DashboardTemplateController(
      { handle: 'dashboardTemplate' } as never,
      { handle: 11 } as never,
      {} as never,
    );

    const result = await controller.beforeInsert(items);

    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
    expect(result.items).toEqual([{ name: 'Ops', isShared: true, person: 11 }]);
  });
});
