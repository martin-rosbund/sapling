/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { SAPLING_FRONTEND_URL } from './constants/project.constants';
import type { PersonItem } from './entity/PersonItem';

type MockRequest = Request & {
  user?: Express.User;
  login: jest.Mock;
  logout: jest.Mock;
  isAuthenticated: jest.Mock;
  session?: {
    regenerate: jest.Mock;
    destroy: jest.Mock;
  };
};

const createMockUser = (): PersonItem =>
  ({
    handle: 1,
    username: 'tester',
  }) as unknown as PersonItem;

const createMockRequest = (
  overrides: Partial<Record<keyof MockRequest, unknown>> = {},
): MockRequest =>
  ({
    user: createMockUser() as unknown as Express.User,
    login: jest.fn(
      (_: unknown, optionsOrCallback: unknown, maybeCallback?: unknown) => {
        const callback =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : maybeCallback;

        if (typeof callback === 'function') {
          (callback as () => void)();
        }
      },
    ),
    logout: jest.fn((callback?: unknown) => {
      if (typeof callback === 'function') {
        (callback as () => void)();
      }
    }),
    isAuthenticated: jest.fn(() => true),
    session: {
      regenerate: jest.fn((callback?: unknown) => {
        if (typeof callback === 'function') {
          (callback as () => void)();
        }
      }),
      destroy: jest.fn((callback?: unknown) => {
        if (typeof callback === 'function') {
          (callback as () => void)();
        }
      }),
    },
    ...overrides,
  }) as unknown as MockRequest;

const createMockResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  }) as unknown as Response;

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('AppController', () => {
  it('returns undefined for the start endpoint', () => {
    const appService = { getEcho: jest.fn() };
    const controller = new AppController(appService);

    expect(controller.getStart()).toBeUndefined();
  });

  it('echoes the provided payload', () => {
    const payload = { message: 'hello' };
    const appService = {
      getEcho: jest.fn(() => payload),
    };
    const controller = new AppController(appService);

    expect(controller.postEcho(payload)).toBe(payload);
    expect(asMock(appService.getEcho)).toHaveBeenCalledWith(payload);
  });
});

describe('AuthController', () => {
  it('logs in locally and returns the authenticated user', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest();
    const res = createMockResponse();

    controller.localLogin(req, res);

    expect(req.session?.regenerate).toHaveBeenCalledWith(expect.any(Function));
    expect(asMock(req.login)).toHaveBeenCalledWith(
      req.user,
      expect.any(Function),
    );
    expect(res.send).toHaveBeenCalledWith();
  });

  it('returns 500 when local login fails', () => {
    const controller = new AuthController({} as never);
    const error = new Error('login failed');
    const req = createMockRequest({
      login: jest.fn(
        (_: unknown, optionsOrCallback: unknown, maybeCallback?: unknown) => {
          const callback =
            typeof optionsOrCallback === 'function'
              ? optionsOrCallback
              : maybeCallback;

          if (typeof callback === 'function') {
            (callback as (error?: Error) => void)(error);
          }
        },
      ),
    });
    const res = createMockResponse();

    controller.localLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it('exposes the azure login endpoint method', () => {
    const controller = new AuthController({} as never);

    expect(controller.azureLogin()).toBeUndefined();
  });

  it('returns 400 for an azure callback without a user', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest({ user: undefined });
    const res = createMockResponse();

    controller.azureCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('User not found');
  });

  it('returns 500 when the azure callback login fails', () => {
    const controller = new AuthController({} as never);
    const error = new Error('azure failed');
    const req = createMockRequest({
      login: jest.fn(
        (_: unknown, optionsOrCallback: unknown, maybeCallback?: unknown) => {
          const callback =
            typeof optionsOrCallback === 'function'
              ? optionsOrCallback
              : maybeCallback;

          if (typeof callback === 'function') {
            (callback as (error?: Error) => void)(error);
          }
        },
      ),
    });
    const res = createMockResponse();

    controller.azureCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it('redirects to the frontend after a successful azure callback', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest();
    const res = createMockResponse();

    controller.azureCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith(SAPLING_FRONTEND_URL);
  });

  it('exposes the google login endpoint method', () => {
    const controller = new AuthController({} as never);

    expect(controller.googleLogin()).toBeUndefined();
  });

  it('returns 400 for a google callback without a user', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest({ user: undefined });
    const res = createMockResponse();

    controller.googleCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('User not found');
  });

  it('returns 500 when the google callback login fails', () => {
    const controller = new AuthController({} as never);
    const error = new Error('google failed');
    const req = createMockRequest({
      login: jest.fn(
        (_: unknown, optionsOrCallback: unknown, maybeCallback?: unknown) => {
          const callback =
            typeof optionsOrCallback === 'function'
              ? optionsOrCallback
              : maybeCallback;

          if (typeof callback === 'function') {
            (callback as (error?: Error) => void)(error);
          }
        },
      ),
    });
    const res = createMockResponse();

    controller.googleCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it('redirects to localhost after a successful google callback', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest();
    const res = createMockResponse();

    controller.googleCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173');
  });

  it('logs out and returns success', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest();
    const res = createMockResponse();

    controller.logout(req, res);

    expect(asMock(req.logout)).toHaveBeenCalledWith(expect.any(Function));
    expect(req.session?.destroy).toHaveBeenCalledWith(expect.any(Function));
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true });
  });

  it('returns authenticated true for authenticated requests', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest();
    const res = createMockResponse();

    controller.isAuthenticated(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ authenticated: true });
  });

  it('returns authenticated false for unauthenticated requests', () => {
    const controller = new AuthController({} as never);
    const req = createMockRequest({ isAuthenticated: jest.fn(() => false) });
    const res = createMockResponse();

    controller.isAuthenticated(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ authenticated: false });
  });
});
