import { EntityManager } from '@mikro-orm/core';
import session from 'express-session';
import { SessionStoreItem } from '../entity/SessionStoreItem';

type SessionData = session.SessionData;
type SessionErrorCallback = (error?: unknown) => void;
type SessionGetCallback = (
  error: unknown,
  session?: SessionData | null,
) => void;

/**
 * Durable database-backed express-session store.
 */
export class DatabaseSessionStore extends session.Store {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly defaultTtlMs: number,
  ) {
    super();
  }

  override get(sid: string, callback: SessionGetCallback): void {
    void this.runGet(callback, async () => {
      const em = this.entityManager.fork();
      const record = await em.findOne(SessionStoreItem, { handle: sid });

      if (!record) {
        return null;
      }

      if (record.expiresAt <= new Date()) {
        await em.nativeDelete(SessionStoreItem, { handle: sid });
        return null;
      }

      return this.deserialize(record.payload);
    });
  }

  override set(
    sid: string,
    sessionData: SessionData,
    callback: SessionErrorCallback = () => undefined,
  ): void {
    void this.run(callback, async () => {
      const em = this.entityManager.fork();
      const record = await em.findOne(SessionStoreItem, { handle: sid });
      const payload = JSON.stringify(sessionData);
      const expiresAt = this.resolveExpiry(sessionData);

      if (record) {
        record.payload = payload;
        record.expiresAt = expiresAt;
      } else {
        em.create(SessionStoreItem, {
          handle: sid,
          payload,
          expiresAt,
        });
      }

      await em.flush();
    });
  }

  override touch(
    sid: string,
    sessionData: SessionData,
    callback: SessionErrorCallback = () => undefined,
  ): void {
    void this.run(callback, async () => {
      const em = this.entityManager.fork();
      const record = await em.findOne(SessionStoreItem, { handle: sid });

      if (!record) {
        return;
      }

      record.payload = JSON.stringify(sessionData);
      record.expiresAt = this.resolveExpiry(sessionData);
      await em.flush();
    });
  }

  override destroy(
    sid: string,
    callback: SessionErrorCallback = () => undefined,
  ): void {
    void this.run(callback, async () => {
      const em = this.entityManager.fork();
      await em.nativeDelete(SessionStoreItem, { handle: sid });
    });
  }

  private async run(
    callback: SessionErrorCallback,
    operation: () => Promise<void>,
  ): Promise<void> {
    try {
      await operation();
      callback();
    } catch (error) {
      callback(error);
    }
  }

  private async runGet(
    callback: SessionGetCallback,
    operation: () => Promise<SessionData | null>,
  ): Promise<void> {
    try {
      const storedSession = await operation();
      callback(null, storedSession);
    } catch (error) {
      callback(error);
    }
  }

  private resolveExpiry(sessionData: SessionData): Date {
    const expires = sessionData.cookie?.expires;

    if (expires instanceof Date && !Number.isNaN(expires.getTime())) {
      return expires;
    }

    if (typeof expires === 'string') {
      const parsed = new Date(expires);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const maxAge =
      typeof sessionData.cookie?.maxAge === 'number'
        ? sessionData.cookie.maxAge
        : this.defaultTtlMs;

    return new Date(Date.now() + maxAge);
  }

  private deserialize(payload: string): SessionData {
    const parsed = JSON.parse(payload) as SessionData;
    const expires = parsed.cookie?.expires;

    if (typeof expires === 'string') {
      parsed.cookie.expires = new Date(expires);
    }

    return parsed;
  }
}
