import { describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import {
  createTrustedRequestOriginMiddleware,
  enforceTrustedRequestOrigin,
  isTrustedRequestOrigin,
  requiresTrustedRequestOrigin,
} from './request-origin-protection';

type MockRequest = Request & {
  headers: Record<string, string | undefined>;
  get: jest.MockedFunction<(name: string) => string | undefined>;
};

type MockResponse = Response & {
  status: jest.MockedFunction<(statusCode: number) => MockResponse>;
  json: jest.MockedFunction<(body: unknown) => MockResponse>;
};

function createRequest(
  overrides: Partial<MockRequest> = {},
  headers: Record<string, string | undefined> = {},
): MockRequest {
  const normalizedHeaders: Record<string, string | undefined> = {
    host: 'api.example.com',
    ...headers,
  };

  return {
    method: 'POST',
    path: '/api/example',
    originalUrl: '/api/example',
    url: '/api/example',
    protocol: 'https',
    headers: normalizedHeaders,
    get: jest.fn((name: string) => normalizedHeaders[name.toLowerCase()]),
    ...overrides,
  } as unknown as MockRequest;
}

function createResponse(): MockResponse {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return response;
}

function createNext(): {
  next: NextFunction;
  nextMock: jest.MockedFunction<(deferToNext?: unknown) => void>;
} {
  const nextMock = jest.fn<(deferToNext?: unknown) => void>();
  const next: NextFunction = (deferToNext?: unknown) => {
    nextMock(deferToNext);
  };

  return { next, nextMock };
}

describe('request-origin-protection', () => {
  it('requires origin validation for unsafe requests that include the session cookie', () => {
    const req = createRequest({}, { cookie: 'sapling.sid=abc123' });

    expect(requiresTrustedRequestOrigin(req)).toBe(true);
  });

  it('does not require origin validation for safe GET requests', () => {
    const req = createRequest(
      {
        method: 'GET',
        path: '/api/auth/logout',
        originalUrl: '/api/auth/logout',
      },
      { cookie: 'sapling.sid=abc123' },
    );

    expect(requiresTrustedRequestOrigin(req)).toBe(false);
  });

  it('skips validation when no session cookie is present', () => {
    const req = createRequest();

    expect(requiresTrustedRequestOrigin(req)).toBe(false);
  });

  it('accepts requests from the configured frontend origin', () => {
    const req = createRequest({}, { origin: 'https://app.example.com' });

    expect(isTrustedRequestOrigin(req, 'https://app.example.com/login')).toBe(
      true,
    );
  });

  it('accepts same-origin requests for backend-hosted clients such as Swagger', () => {
    const req = createRequest({}, { origin: 'https://api.example.com' });

    expect(isTrustedRequestOrigin(req, 'https://app.example.com')).toBe(true);
  });

  it('rejects missing origin metadata for credentialed unsafe requests', () => {
    const req = createRequest({}, { cookie: 'sapling.sid=abc123' });
    const res = createResponse();
    const { next, nextMock } = createNext();

    enforceTrustedRequestOrigin(req, res, next);

    expect(nextMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message:
        'Cross-site credentialed request rejected due to missing or untrusted origin.',
    });
  });

  it('allows credentialed unsafe requests when the referer matches the trusted frontend', () => {
    const req = createRequest(
      {},
      {
        cookie: 'sapling.sid=abc123',
        referer: 'https://app.example.com/settings?tab=profile',
      },
    );
    const res = createResponse();
    const { next, nextMock } = createNext();
    const middleware = createTrustedRequestOriginMiddleware(
      'https://app.example.com',
    );

    const trusted = isTrustedRequestOrigin(req, 'https://app.example.com');
    middleware(req, res, next);

    expect(trusted).toBe(true);
    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
