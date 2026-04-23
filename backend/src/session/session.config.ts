import { EntityManager } from '@mikro-orm/core';
import session from 'express-session';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SAME_SITE,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE,
  SESSION_TRUST_PROXY,
} from '../constants/project.constants';
import { getSaplingSecretOrThrow } from '../security/sapling-secret';
import { DatabaseSessionStore } from './database-session.store';

export {
  getSaplingSecretOrThrow,
  SAPLING_SECRET_MISSING_MESSAGE,
} from '../security/sapling-secret';

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
