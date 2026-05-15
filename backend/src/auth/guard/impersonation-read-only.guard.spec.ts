import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ImpersonationReadOnlyGuard } from './impersonation-read-only.guard';

const createContext = (req: unknown) =>
  ({
    getType: () => 'http' as const,
    switchToHttp: () => ({ getRequest: () => req }),
  }) as never;

describe('ImpersonationReadOnlyGuard', () => {
  const guard = new ImpersonationReadOnlyGuard();

  it('allows requests without a user', () => {
    expect(
      guard.canActivate(createContext({ method: 'POST', path: '/api/x' })),
    ).toBe(true);
  });

  it('allows requests for non-impersonated users', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          path: '/api/x',
          user: { handle: 1 },
        }),
      ),
    ).toBe(true);
  });

  it('allows GET requests while impersonating', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'GET',
          path: '/api/anything',
          user: { handle: 7, _impersonator: { handle: 1 } },
        }),
      ),
    ).toBe(true);
  });

  it('allows the stop endpoint while impersonating', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          path: '/api/auth/impersonate/stop',
          user: { handle: 7, _impersonator: { handle: 1 } },
        }),
      ),
    ).toBe(true);
  });

  it('allows auth endpoints (login/logout) so users can recover a stale session', () => {
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          path: '/api/auth/local/login',
          user: { handle: 7, _impersonator: { handle: 1 } },
        }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          path: '/api/auth/logout',
          user: { handle: 7, _impersonator: { handle: 1 } },
        }),
      ),
    ).toBe(true);
  });

  it('blocks write requests while impersonating', () => {
    expect(() =>
      guard.canActivate(
        createContext({
          method: 'POST',
          path: '/api/generic/role',
          user: { handle: 7, _impersonator: { handle: 1 } },
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
