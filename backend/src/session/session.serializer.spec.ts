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
});
