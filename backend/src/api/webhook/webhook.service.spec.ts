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

type TemplateField = {
  name: string;
  type?: string;
  isReference?: boolean;
  referenceName?: string;
  kind?: string;
};

const createTemplateField = (overrides: TemplateField) => ({
  name: '',
  type: 'string',
  isReference: false,
  referenceName: '',
  kind: undefined,
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
    const flushPersist = jest.fn().mockResolvedValue(undefined);
    const em = {
      findOne: jest
        .fn()
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
      populate: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
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
      add: jest.fn().mockResolvedValue(undefined),
    };
    const service = new WebhookService(
      em as never,
      templateService as never,
      queue as never,
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
    expect(queue.add).toHaveBeenCalledWith('deliver-webhook', {
      deliveryId: 99,
    });
    expect(delivery.handle).toBe(99);
    expect(flushPersist).toHaveBeenCalled();
  });
});
