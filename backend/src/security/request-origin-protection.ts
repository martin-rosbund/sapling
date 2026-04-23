import type { NextFunction, Request, Response } from 'express';
import {
  SAPLING_FRONTEND_URL,
  SESSION_COOKIE_NAME,
} from '../constants/project.constants';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_REJECTION_MESSAGE =
  'Cross-site credentialed request rejected due to missing or untrusted origin.';

function getHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(req: Request): string | null {
  const host = req.get('host') || getHeaderValue(req.headers.host);

  if (!host || !req.protocol) {
    return null;
  }

  return normalizeOrigin(`${req.protocol}://${host}`);
}

function hasSessionCookie(req: Request, sessionCookieName: string): boolean {
  const cookieHeader = getHeaderValue(req.headers.cookie);

  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(';')
    .some((cookie) => cookie.trim().startsWith(`${sessionCookieName}=`));
}

export function requiresTrustedRequestOrigin(
  req: Request,
  sessionCookieName: string = SESSION_COOKIE_NAME,
): boolean {
  if (!hasSessionCookie(req, sessionCookieName)) {
    return false;
  }

  const method = req.method.toUpperCase();

  return !SAFE_METHODS.has(method);
}

export function isTrustedRequestOrigin(
  req: Request,
  frontendUrl: string = SAPLING_FRONTEND_URL,
): boolean {
  const requestOrigin =
    normalizeOrigin(getHeaderValue(req.headers.origin)) ||
    normalizeOrigin(getHeaderValue(req.headers.referer));

  if (!requestOrigin) {
    return false;
  }

  const allowedOrigins = new Set<string>();
  const frontendOrigin = normalizeOrigin(frontendUrl);
  const sameOrigin = getRequestOrigin(req);

  if (frontendOrigin) {
    allowedOrigins.add(frontendOrigin);
  }

  if (sameOrigin) {
    allowedOrigins.add(sameOrigin);
  }

  return allowedOrigins.has(requestOrigin);
}

export function createTrustedRequestOriginMiddleware(
  frontendUrl: string = SAPLING_FRONTEND_URL,
  sessionCookieName: string = SESSION_COOKIE_NAME,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!requiresTrustedRequestOrigin(req, sessionCookieName)) {
      next();
      return;
    }

    if (isTrustedRequestOrigin(req, frontendUrl)) {
      next();
      return;
    }

    res.status(403).json({ message: CSRF_REJECTION_MESSAGE });
  };
}

export const enforceTrustedRequestOrigin =
  createTrustedRequestOriginMiddleware();
