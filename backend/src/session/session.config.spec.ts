import { describe, expect, it } from '@jest/globals';
import { DatabaseSessionStore } from './database-session.store';
import {
  createSessionCookieOptions,
  createSessionCookieSecurityOptions,
  createSessionOptions,
} from './session.config';

describe('session.config', () => {
  it('builds a hardened cookie configuration', () => {
    expect(createSessionCookieSecurityOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
    });
    expect(createSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600000,
    });
  });

  it('uses a durable database-backed store', () => {
    const options = createSessionOptions({} as never);

    expect(options.name).toBe('sapling.sid');
    expect(options.saveUninitialized).toBe(false);
    expect(options.resave).toBe(false);
    expect(options.store).toBeInstanceOf(DatabaseSessionStore);
  });
});
