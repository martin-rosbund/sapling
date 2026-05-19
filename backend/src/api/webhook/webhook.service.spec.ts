import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../entity/global/entity.decorator', () => ({
  hasSaplingOption: jest.fn(
    (_target: unknown, fieldName: string, option: string) =>
      fieldName === 'loginPassword' && option === 'isSecurity',
  ),
}));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_MAP: {
    ticket: class TicketItem {},
    person: class PersonItem {},
    company: class CompanyItem {},
  },
}));
jest.mock('../../entity/WebhookSubscriptionItem', () => ({
  WebhookSubscriptionItem: class {},
}));
jest.mock('../../entity/WebhookDeliveryItem', () => ({
  WebhookDeliveryItem: class {
    handle?: number;
    payload?: object;
    subscription?: object;
    status?: object;
  },
}));
jest.mock('../../entity/WebhookDeliveryStatusItem', () => ({
  WebhookDeliveryStatusItem: class {},
}));
jest.mock('../template/template.service', () => ({
  TemplateService: class {},
}));

import { WebhookService } from './webhook.service';
import { REDIS_ENABLED } from '../../constants/project.constants';

type TemplateField = {
  name: string;
  type?: string;
  isReference?: boolean;
  referenceName?: string;
  kind?: string;
};

const createTemplateField = (overrides: TemplateField) => ({
  type: 'string',
  isReference: false,
  referenceName: '',
  ...overrides,
});

describe('WebhookService', () => {
  beforeEach(() => {
    global.log = {
      warn: jest.fn(),
      trace: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('reloads configured relations for plain webhook payloads and strips security fields', async () => {
    const reloadedRecord = {
      handle: 7,
      creatorPerson: {
        handle: 4,
        email: 'ada@example.com',
        loginPassword: 'secret-hash',
        company: {
          handle: 11,
          name: 'Acme GmbH',
        },
      },
    };

    const persistedDeliveries: Array<{ payload?: object; handle?: number }> =
      [];
    const flushPersist = jest
      .fn<() => Promise<undefined>>()
      .mockResolvedValue(undefined);
    const em = {
      findOne: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValueOnce({
          handle: 5,
          isActive: true,
          relations: ['creatorPerson', 'creatorPerson.company'],
          type: { handle: 'afterUpdate' },
          entity: { handle: 'ticket' },
        })
        .mockResolvedValueOnce({ handle: 'pending' })
        .mockResolvedValueOnce(reloadedRecord),
      persist: jest.fn((delivery: { handle?: number; payload?: object }) => {
        delivery.handle = 99;
        persistedDeliveries.push(delivery);
        return {
          flush: flushPersist,
        };
      }),
      populate: jest
        .fn<(...args: unknown[]) => Promise<undefined>>()
        .mockResolvedValue(undefined),
      flush: jest
        .fn<(...args: unknown[]) => Promise<undefined>>()
        .mockResolvedValue(undefined),
    };
    const templateService = {
      getEntityTemplate: jest.fn((entityHandle: string) => {
        switch (entityHandle) {
          case 'ticket':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({
                name: 'creatorPerson',
                isReference: true,
                kind: 'm:1',
                referenceName: 'person',
              }),
            ];
          case 'person':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'email', type: 'string' }),
              createTemplateField({ name: 'loginPassword', type: 'string' }),
              createTemplateField({
                name: 'company',
                isReference: true,
                kind: 'm:1',
                referenceName: 'company',
              }),
            ];
          case 'company':
            return [
              createTemplateField({ name: 'handle', type: 'number' }),
              createTemplateField({ name: 'name', type: 'string' }),
            ];
          default:
            return [];
        }
      }),
    };
    const queue = {
      add: jest
        .fn<(...args: unknown[]) => Promise<undefined>>()
        .mockResolvedValue(undefined),
    };
    const persistedDelivery = {
      handle: 99,
      payload: [
        {
          handle: 7,
          creatorPerson: {
            handle: 4,
            email: 'ada@example.com',
            company: {
              handle: 11,
              name: 'Acme GmbH',
            },
          },
        },
      ],
    };
    const webhookDeliveryExecutor = {
      execute: jest
        .fn<(...args: unknown[]) => Promise<undefined>>()
        .mockResolvedValue(undefined),
    };
    em.findOneOrFail = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(persistedDelivery);
    const service = new WebhookService(
      em as never,
      templateService as never,
      queue as never,
      webhookDeliveryExecutor as never,
    );

    const delivery = await service.querySubscription(5, [{ handle: 7 }]);

    expect(em.findOne).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      { handle: 7 },
      {
        populate: ['creatorPerson', 'creatorPerson.company'],
      },
    );
    expect(em.populate).not.toHaveBeenCalled();
    expect(persistedDeliveries[0]?.payload).toEqual([
      {
        handle: 7,
        creatorPerson: {
          handle: 4,
          email: 'ada@example.com',
          company: {
            handle: 11,
            name: 'Acme GmbH',
          },
        },
      },
    ]);
    if (REDIS_ENABLED) {
      expect(queue.add).toHaveBeenCalledWith('deliver-webhook', {
        deliveryId: 99,
      });
      expect(webhookDeliveryExecutor.execute).not.toHaveBeenCalled();
    } else {
      expect(webhookDeliveryExecutor.execute).toHaveBeenCalledWith(99, 1);
      expect(queue.add).not.toHaveBeenCalled();
    }
    expect(delivery.handle).toBe(99);
    expect(flushPersist).toHaveBeenCalled();
  });
});
