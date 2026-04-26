import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/McpServerConfigItem', () => ({
  McpServerConfigItem: class {},
}));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { McpServerConfigController } from './McpServerConfigController';
import { ScriptResultServerMethods } from './core/script.result.server';
import type { McpServerConfigItem } from '../entity/McpServerConfigItem';

describe('McpServerConfigController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty environment and auth config blocks', async () => {
    const items = [
      { handle: 1, environment: null, authConfig: null },
      {
        handle: 2,
        environment: { NODE_ENV: 'production' },
        authConfig: { type: 'token' },
      },
    ] as McpServerConfigItem[];
    const controller = new McpServerConfigController(
      { handle: 'mcpServerConfig' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('environment' in items[0]).toBe(false);
    expect('authConfig' in items[0]).toBe(false);
    expect(items[1].environment).toEqual({ NODE_ENV: 'production' });
    expect(items[1].authConfig).toEqual({ type: 'token' });
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });
});
