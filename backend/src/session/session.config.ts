import { EntityManager } from '@mikro-orm/core';
import session from 'express-session';
import {
  SAPLING_SECRET,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SAME_SITE,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE,
  SESSION_TRUST_PROXY,
} from '../constants/project.constants';
import { DatabaseSessionStore } from './database-session.store';

export const SAPLING_SECRET_MISSING_MESSAGE =
  'SAPLING_SECRET must be configured before starting the server.';

export function getSaplingSecretOrThrow(
  secret: string | null = SAPLING_SECRET,
): string {
  const normalizedSecret = secret?.trim();

  if (
    !normalizedSecret ||
    normalizedSecret.toLowerCase() === 'null' ||
    normalizedSecret.toLowerCase() === 'undefined'
  ) {
    throw new Error(SAPLING_SECRET_MISSING_MESSAGE);
  }

  return normalizedSecret;
}

/**
 * Shared cookie security settings for auth sessions.
 */
export function createSessionCookieSecurityOptions(): Pick<
  session.CookieOptions,
  'httpOnly' | 'sameSite'
> & { secure: boolean } {
  const secure = SESSION_COOKIE_SECURE || SESSION_COOKIE_SAME_SITE === 'none';

  return {
    httpOnly: true,
    sameSite: SESSION_COOKIE_SAME_SITE,
    secure,
  };
}

/**
 * Complete express-session cookie configuration.
 */
export function createSessionCookieOptions(): session.CookieOptions {
  return {
    ...createSessionCookieSecurityOptions(),
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * Full express-session configuration with a durable database store.
 */
export function createSessionOptions(
  entityManager: EntityManager,
): session.SessionOptions {
  const cookie = createSessionCookieOptions();

  return {
    name: SESSION_COOKIE_NAME,
    secret: getSaplingSecretOrThrow(),
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    proxy: SESSION_TRUST_PROXY > 0 || cookie.secure === true,
    store: new DatabaseSessionStore(entityManager, SESSION_MAX_AGE),
    cookie,
  };
}

/**
 * Applies reverse proxy trust when deployments terminate TLS upstream.
 */
export function applySessionTrustProxy(app: {
  set(setting: string, value: unknown): unknown;
}): void {
  if (SESSION_TRUST_PROXY > 0) {
    app.set('trust proxy', SESSION_TRUST_PROXY);
  }
}
