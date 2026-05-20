import { describe, expect, it, jest } from '@jest/globals';
import { SessionSerializer } from './session.serializer';

describe('SessionSerializer', () => {
  it('serializes only the numeric user handle', () => {
    const serializer = new SessionSerializer({} as never);
    const done = jest.fn();

    serializer.serializeUser({ handle: 42 }, done);

    expect(done).toHaveBeenCalledWith(null, { handle: 42 });
  });

  it('reloads the user from the database during deserialization', async () => {
    const user = { handle: 42, isActive: true };
    const authService = {
      getSecurityUserByHandle: jest
        .fn<(handle: number) => Promise<typeof user | null>>()
        .mockResolvedValue(user),
    };
    const serializer = new SessionSerializer(authService as never);
    const done = jest.fn();

    await serializer.deserializeUser({ handle: 42 }, done);

    expect(authService.getSecurityUserByHandle).toHaveBeenCalledWith(42);
    expect(done).toHaveBeenCalledWith(null, user);
  });

  it('rejects sessions for deleted or inactive users', async () => {
    const authService = {
      getSecurityUserByHandle: jest
        .fn<
          (
            handle: number,
          ) => Promise<{ handle: number; isActive: boolean } | null>
        >()
        .mockResolvedValue(null),
    };
    const serializer = new SessionSerializer(authService as never);
    const done = jest.fn();

    await serializer.deserializeUser({ handle: 42 }, done);

    expect(done).toHaveBeenCalledWith(null, false);
  });

  it('substitutes the impersonated user when the real user is administrator', async () => {
    const admin = {
      handle: 1,
      isActive: true,
      firstName: 'Ada',
      lastName: 'Admin',
      roles: [{ isAdministrator: true }],
    };
    const target = {
      handle: 7,
      isActive: true,
      firstName: 'Tom',
      lastName: 'Target',
      roles: [{ isAdministrator: false }],
    };
    const authService = {
      getSecurityUserByHandle: jest
        .fn<(handle: number) => Promise<unknown>>()
        .mockImplementation((handle: number) =>
          Promise.resolve(handle === 1 ? admin : target),
        ),
    };
    const serializer = new SessionSerializer(authService as never);
    const done = jest.fn();

    await serializer.deserializeUser(
      { handle: 1, impersonatedHandle: 7 },
      done,
    );

    expect(done).toHaveBeenCalledTimes(1);
    const args = done.mock.calls[0] as [unknown, unknown];
    expect(args[0]).toBeNull();
    expect(args[1]).toBe(target);
    expect(
      (target as { _impersonator?: { handle: number } })._impersonator,
    ).toEqual({ handle: 1, firstName: 'Ada', lastName: 'Admin' });
  });

  it('ignores impersonation when the real user is not administrator', async () => {
    const realUser = {
      handle: 1,
      isActive: true,
      firstName: 'Norma',
      lastName: 'NonAdmin',
      roles: [{ isAdministrator: false }],
    };
    const authService = {
      getSecurityUserByHandle: jest
        .fn<(handle: number) => Promise<unknown>>()
        .mockResolvedValue(realUser),
    };
    const serializer = new SessionSerializer(authService as never);
    const done = jest.fn();

    await serializer.deserializeUser(
      { handle: 1, impersonatedHandle: 7 },
      done,
    );

    expect(authService.getSecurityUserByHandle).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(null, realUser);
  });

  it('falls back to the real user when impersonation target is inactive', async () => {
    const admin = {
      handle: 1,
      isActive: true,
      firstName: 'Ada',
      lastName: 'Admin',
      roles: [{ isAdministrator: true }],
    };
    const target = {
      handle: 7,
      isActive: false,
      firstName: 'Inactive',
      lastName: 'Person',
      roles: [],
    };
    const authService = {
      getSecurityUserByHandle: jest
        .fn<(handle: number) => Promise<unknown>>()
        .mockImplementation((handle: number) =>
          Promise.resolve(handle === 1 ? admin : target),
        ),
    };
    const serializer = new SessionSerializer(authService as never);
    const done = jest.fn();

    await serializer.deserializeUser(
      { handle: 1, impersonatedHandle: 7 },
      done,
    );

    expect(done).toHaveBeenCalledWith(null, admin);
  });
});
