import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Observable, of } from 'rxjs';
import { WebhookProcessor } from './webhook.processor';

jest.mock('../../entity/WebhookDeliveryItem', () => ({
  WebhookDeliveryItem: class {},
}));
jest.mock('../../entity/WebhookDeliveryStatusItem', () => ({
  WebhookDeliveryStatusItem: class {},
}));

type TestDeliveryStatus = {
  handle: string;
};

type TestDelivery = {
  payload: unknown;
  status?: TestDeliveryStatus;
  subscription: {
    url: string;
    signingSecret: string;
    customHeaders?: undefined;
    containerName?: string;
    payloadType: { handle: string };
    type: { handle: string };
    method: { handle: string };
    authenticationType: { handle: string };
  };
};

type PostResponse = {
  status: number;
  data: { ok: boolean };
  headers: { server: string };
};

describe('WebhookProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps the outbound payload in the configured container as a string', async () => {
    const flush = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const successStatus: TestDeliveryStatus = { handle: 'success' };
    const delivery: TestDelivery = {
      payload: [{ handle: 7, description: 'Payload value' }],
      subscription: {
        url: 'https://example.invalid/webhook',
        signingSecret: 'secret',
        customHeaders: undefined,
        containerName: 'container',
        payloadType: { handle: 'item' },
        type: { handle: 'afterInsert' },
        method: { handle: 'post' },
        authenticationType: { handle: 'none' },
      },
    };
    const findOne = jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(delivery)
      .mockResolvedValueOnce(successStatus);

    const em = {
      fork: jest.fn(() => ({
        findOne,
        flush,
      })),
    };
    const post = jest
      .fn<
        (
          url: string,
          body: unknown,
          config: unknown,
        ) => Observable<PostResponse>
      >()
      .mockReturnValue(
        of({ status: 200, data: { ok: true }, headers: { server: 'test' } }),
      );
    const httpService = {
      post,
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };
    const processor = new WebhookProcessor(em as never, httpService as never);

    await processor.process({
      data: { deliveryId: 42 },
      attemptsMade: 0,
    } as never);

    expect(post).toHaveBeenCalledWith(
      'https://example.invalid/webhook',
      {
        container: JSON.stringify({ handle: 7, description: 'Payload value' }),
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'afterInsert',
          'X-Webhook-Signature': expect.any(String),
        }),
      }),
    );
    expect(delivery.payload).toEqual({
      container: JSON.stringify({ handle: 7, description: 'Payload value' }),
    });
    expect(delivery.status).toBe(successStatus);
    expect(flush).toHaveBeenCalled();
  });
});
