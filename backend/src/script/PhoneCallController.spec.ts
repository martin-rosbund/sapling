import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/EventItem', () => ({ EventItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/PhoneCallItem', () => ({ PhoneCallItem: class {} }));

import { PhoneCallController } from './PhoneCallController';
import { EventItem } from '../entity/EventItem';
import type { PhoneCallItem } from '../entity/PhoneCallItem';
import type { PersonItem } from '../entity/PersonItem';

describe('PhoneCallController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('creates a 15-minute event starting at the phone call creation time', async () => {
    const participants = { add: jest.fn() };
    const createdEvent = { participants } as unknown as EventItem;
    const create = jest.fn((_: unknown, __: unknown) => createdEvent);
    const em = {
      create,
      persist: jest.fn(),
      flush: jest.fn(() => Promise.resolve(undefined)),
    };
    const company = { handle: 11 };
    const phoneCallPerson = { handle: 22, company } as PersonItem;
    const currentUser = { handle: 33, company } as PersonItem;
    const phoneCallCreatedAt = new Date('2026-04-19T10:15:00.000Z');
    const phoneCall = {
      handle: 44,
      phoneNumber: '+49 30 123456',
      note: 'Rueckruf',
      createdAt: phoneCallCreatedAt,
      person: phoneCallPerson,
    } as PhoneCallItem;
    const controller = new PhoneCallController(
      { handle: 'phoneCall' } as never,
      currentUser,
      em as never,
    );

    await controller.afterInsert([phoneCall]);

    expect(create).toHaveBeenCalledWith(
      EventItem,
      expect.objectContaining({
        title: 'Telefonat +49 30 123456',
        description: 'Rueckruf',
        startDate: phoneCallCreatedAt,
        endDate: new Date('2026-04-19T10:30:00.000Z'),
        isAllDay: false,
        type: { handle: 'internal' },
        status: { handle: 'scheduled' },
        assigneeCompany: company,
        assigneePerson: phoneCallPerson,
        creatorCompany: company,
        creatorPerson: currentUser,
      }),
    );
    expect(participants.add).toHaveBeenCalledWith(phoneCallPerson);
    expect(em.persist).toHaveBeenCalledWith(createdEvent);
    expect(em.flush).toHaveBeenCalled();
  });
});
