import { describe, expect, it, jest } from '@jest/globals';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  it('retries with a refreshed token after a graph authentication error', async () => {
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue();
    const delivery = {
      handle: 17,
      attemptCount: 0,
      bodyHtml: '<p>Hello</p>',
      createdBy: {
        loginName: 'sender@example.com',
        type: { handle: 'azure' },
        session: {
          accessToken: 'stale-token',
          refreshToken: 'refresh-token',
        },
      },
      recipientPerson: {
        loginName: 'recipient@example.com',
        type: { handle: 'azure' },
      },
    };
    const fork = {
      findOne: jest.fn<() => Promise<unknown>>().mockResolvedValue(delivery),
      flush,
    };
    const em = {
      fork: jest.fn(() => fork),
    };

    const service = new TeamsService(
      em as never,
      {} as never,
      { add: jest.fn() } as never,
    );

    const sendTeamsMessage = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce({
        statusCode: 401,
        body: {
          error: {
            code: 'InvalidAuthenticationToken',
          },
        },
        message: 'Expired token',
      })
      .mockResolvedValueOnce({
        chatId: 'chat-1',
        messageId: 'message-1',
      });
    const refreshAzureAccessToken = jest
      .fn<() => Promise<string | null>>()
      .mockResolvedValue('fresh-token');
    const ensureStatus = jest
      .fn<() => Promise<{ handle: string }>>()
      .mockImplementation(async (_targetEm: unknown, handle: string) => ({
        handle,
      }));

    (
      service as never as {
        sendTeamsMessage: typeof sendTeamsMessage;
        refreshAzureAccessToken: typeof refreshAzureAccessToken;
        ensureStatus: typeof ensureStatus;
      }
    ).sendTeamsMessage = sendTeamsMessage;
    (
      service as never as {
        refreshAzureAccessToken: typeof refreshAzureAccessToken;
      }
    ).refreshAzureAccessToken = refreshAzureAccessToken;
    (
      service as never as {
        ensureStatus: typeof ensureStatus;
      }
    ).ensureStatus = ensureStatus;

    const result = await service.dispatchDelivery(17);

    expect(refreshAzureAccessToken).toHaveBeenCalledWith(
      fork,
      delivery.createdBy.session,
    );
    expect(sendTeamsMessage).toHaveBeenNthCalledWith(
      1,
      'stale-token',
      delivery,
      'sender@example.com',
      'recipient@example.com',
    );
    expect(sendTeamsMessage).toHaveBeenNthCalledWith(
      2,
      'fresh-token',
      delivery,
      'sender@example.com',
      'recipient@example.com',
    );
    expect(delivery.status).toEqual({ handle: 'success' });
    expect(delivery.responseStatusCode).toBe(201);
    expect(delivery.providerMessageId).toBe('message-1');
    expect(result).toBe(delivery);
  });

  it('does not refresh tokens for non-authentication graph errors', async () => {
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue();
    const delivery = {
      handle: 18,
      attemptCount: 0,
      bodyHtml: '<p>Hello</p>',
      createdBy: {
        loginName: 'sender@example.com',
        type: { handle: 'azure' },
        session: {
          accessToken: 'stale-token',
          refreshToken: 'refresh-token',
        },
      },
      recipientPerson: {
        loginName: 'recipient@example.com',
        type: { handle: 'azure' },
      },
    };
    const fork = {
      findOne: jest.fn<() => Promise<unknown>>().mockResolvedValue(delivery),
      flush,
    };
    const em = {
      fork: jest.fn(() => fork),
    };

    const service = new TeamsService(
      em as never,
      {} as never,
      { add: jest.fn() } as never,
    );

    const providerError = {
      statusCode: 500,
      body: {
        error: {
          code: 'InternalServerError',
        },
      },
      message: 'Provider unavailable',
    };
    const sendTeamsMessage = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(providerError);
    const refreshAzureAccessToken = jest
      .fn<() => Promise<string | null>>()
      .mockResolvedValue('fresh-token');
    const ensureStatus = jest
      .fn<() => Promise<{ handle: string }>>()
      .mockImplementation(async (_targetEm: unknown, handle: string) => ({
        handle,
      }));

    (
      service as never as {
        sendTeamsMessage: typeof sendTeamsMessage;
        refreshAzureAccessToken: typeof refreshAzureAccessToken;
        ensureStatus: typeof ensureStatus;
      }
    ).sendTeamsMessage = sendTeamsMessage;
    (
      service as never as {
        refreshAzureAccessToken: typeof refreshAzureAccessToken;
      }
    ).refreshAzureAccessToken = refreshAzureAccessToken;
    (
      service as never as {
        ensureStatus: typeof ensureStatus;
      }
    ).ensureStatus = ensureStatus;

    await expect(service.dispatchDelivery(18)).rejects.toEqual(providerError);

    expect(refreshAzureAccessToken).not.toHaveBeenCalled();
    expect(sendTeamsMessage).toHaveBeenCalledTimes(1);
    expect(delivery.status).toEqual({ handle: 'failed' });
    expect(delivery.responseStatusCode).toBe(500);
  });
});
