import { describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { SAPLING_FRONTEND_URL } from './constants/project.constants';
import type { PersonItem } from './entity/PersonItem';

const createMockUser = (): PersonItem =>
  ({
    handle: 1,
    username: 'tester',
  }) as PersonItem;

const createMockRequest = (
  overrides: Partial<Request> = {},
): Request =>
  ({
    user: createMockUser(),
    login: jest.fn((_: unknown, callback: (error?: Error) => void) => callback()),
    logout: jest.fn((callback: () => void) => callback()),
    isAuthenticated: jest.fn(() => true),
    ...overrides,
  }) as unknown as Request;

const createMockResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('AppController', () => {
  it('returns undefined for the start endpoint', () => {
    const appService = { getEcho: jest.fn() };
    const controller = new AppController(appService as never);

    expect(controller.getStart()).toBeUndefined();
  });

  it('echoes the provided payload', () => {
    const payload = { message: 'hello' };
    const appService = {
      getEcho: jest.fn(() => payload),
    };
    const controller = new AppController(appService as never);

    expect(controller.postEcho(payload)).toBe(payload);
    expect(appService.getEcho).toHaveBeenCalledWith(payload);
  });
});

describe('AuthController', () => {
  it('logs in locally and returns the authenticated user', () => {
    const controller = new AuthController();
    const req = createMockRequest();
    const res = createMockResponse();

    controller.localLogin(req, res);

    expect(req.login).toHaveBeenCalledWith(req.user, expect.any(Function));
    expect(res.send).toHaveBeenCalledWith(req.user);
  });

  it('returns 500 when local login fails', () => {
    const controller = new AuthController();
    const error = new Error('login failed');
    const req = createMockRequest({
      login: jest.fn((_: unknown, callback: (err?: Error) => void) =>
        callback(error),
      ),
    });
    const res = createMockResponse();

    controller.localLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it('exposes the azure login endpoint method', () => {
    const controller = new AuthController();

    expect(controller.azureLogin()).toBeUndefined();
  });

  it('returns 400 for an azure callback without a user', () => {
    const controller = new AuthController();
    const req = createMockRequest({ user: undefined });
    const res = createMockResponse();

    controller.azureCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('User not found');
  });

  it('returns 500 when the azure callback login fails', () => {
    const controller = new AuthController();
    const error = new Error('azure failed');
    const req = createMockRequest({
      login: jest.fn((_: unknown, callback: (err?: Error) => void) =>
        callback(error),
      ),
    });
    const res = createMockResponse();

    controller.azureCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it('redirects to the frontend after a successful azure callback', () => {
    const controller = new AuthController();
    const req = createMockRequest();
    const res = createMockResponse();

    controller.azureCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith(SAPLING_FRONTEND_URL);
  });

  it('exposes the google login endpoint method', () => {
    const controller = new AuthController();

    expect(controller.googleLogin()).toBeUndefined();
  });

  it('returns 400 for a google callback without a user', () => {
    const controller = new AuthController();
    const req = createMockRequest({ user: undefined });
    const res = createMockResponse();

    controller.googleCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('User not found');
  });

  it('returns 500 when the google callback login fails', () => {
    const controller = new AuthController();
    const error = new Error('google failed');
    const req = createMockRequest({
      login: jest.fn((_: unknown, callback: (err?: Error) => void) =>
        callback(error),
      ),
    });
    const res = createMockResponse();

    controller.googleCallback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it('redirects to localhost after a successful google callback', () => {
    const controller = new AuthController();
    const req = createMockRequest();
    const res = createMockResponse();

    controller.googleCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173');
  });

  it('logs out and returns success', () => {
    const controller = new AuthController();
    const req = createMockRequest();
    const res = createMockResponse();

    controller.logout(req, res);

    expect(req.logout).toHaveBeenCalledWith(expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true });
  });

  it('returns authenticated true for authenticated requests', () => {
    const controller = new AuthController();
    const req = createMockRequest();
    const res = createMockResponse();

    controller.isAuthenticated(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ authenticated: true });
  });

  it('returns authenticated false for unauthenticated requests', () => {
    const controller = new AuthController();
    const req = createMockRequest({ isAuthenticated: jest.fn(() => false) });
    const res = createMockResponse();

    controller.isAuthenticated(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ authenticated: false });
  });
});
