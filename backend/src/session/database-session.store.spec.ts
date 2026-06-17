import { describe, expect, it, jest } from '@jest/globals';
import { DatabaseSessionStore } from './database-session.store';

type MockSessionRecord = {
  handle: string;
  payload: string;
  expiresAt: Date;
};

type MockEntityManager = {
  findOne: jest.Mock<(...args: unknown[]) => Promise<MockSessionRecord | null>>;
  flush: jest.Mock<() => Promise<void>>;
};

function createStore(record: MockSessionRecord | null) {
  const em: MockEntityManager = {
    findOne: jest.fn<(...args: unknown[]) => Promise<MockSessionRecord | null>>(
      async () => record,
    ),
    flush: jest.fn<() => Promise<void>>(async () => undefined),
  };

  const rootEm = {
    fork: jest.fn(() => em),
  };

  return {
    em,
    store: new DatabaseSessionStore(rootEm as never, 60_000),
  };
}

function touchAsync(
  store: DatabaseSessionStore,
  sid: string,
  sessionData: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    store.touch(sid, sessionData as never, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

describe('DatabaseSessionStore', () => {
  it('touches expiry without overwriting the stored session payload', async () => {
    const impersonatedPayload = JSON.stringify({
      cookie: { maxAge: 60_000 },
      passport: { user: { handle: 1, impersonatedHandle: 7 } },
    });
    const staleRequestPayload = {
      cookie: { maxAge: 120_000 },
      passport: { user: { handle: 1 } },
    };
    const record: MockSessionRecord = {
      handle: 'session-1',
      payload: impersonatedPayload,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const { em, store } = createStore(record);

    await touchAsync(store, 'session-1', staleRequestPayload);

    expect(record.payload).toBe(impersonatedPayload);
    expect(record.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(em.flush).toHaveBeenCalledTimes(1);
  });
});
