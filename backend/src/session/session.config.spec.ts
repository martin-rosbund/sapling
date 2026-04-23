import { describe, expect, it } from '@jest/globals';
import { DatabaseSessionStore } from './database-session.store';
import {
  SAPLING_SECRET_MISSING_MESSAGE,
  createSessionCookieOptions,
  createSessionCookieSecurityOptions,
  createSessionOptions,
  getSaplingSecretOrThrow,
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

  it('rejects a missing sapling secret', () => {
    expect(() => getSaplingSecretOrThrow(null)).toThrow(
      SAPLING_SECRET_MISSING_MESSAGE,
    );
    expect(() => getSaplingSecretOrThrow('   ')).toThrow(
      SAPLING_SECRET_MISSING_MESSAGE,
    );
    expect(() => getSaplingSecretOrThrow('NULL')).toThrow(
      SAPLING_SECRET_MISSING_MESSAGE,
    );
  });
});
