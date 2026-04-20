import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/EventItem', () => ({ EventItem: class {} }));
jest.mock('../entity/EventStatusItem', () => ({ EventStatusItem: class {} }));
jest.mock('../entity/EventTypeItem', () => ({ EventTypeItem: class {} }));
jest.mock('../entity/CompanyItem', () => ({ CompanyItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/PhoneCallItem', () => ({ PhoneCallItem: class {} }));

import { PhoneCallController } from './PhoneCallController';
import { EventItem } from '../entity/EventItem';
import { EventStatusItem } from '../entity/EventStatusItem';
import { EventTypeItem } from '../entity/EventTypeItem';
import { CompanyItem } from '../entity/CompanyItem';
import { PersonItem as PersonEntity } from '../entity/PersonItem';
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
    const create = jest.fn(() => createdEvent);
    const assigneeCompanyRef = { kind: 'assigneeCompanyRef' };
    const assigneePersonRef = { kind: 'assigneePersonRef' };
    const creatorCompanyRef = { kind: 'creatorCompanyRef' };
    const creatorPersonRef = { kind: 'creatorPersonRef' };
    const eventTypeRef = { kind: 'eventTypeRef' };
    const eventStatusRef = { kind: 'eventStatusRef' };
    const getReference = jest.fn((entity: unknown, handle: unknown) => {
      if (entity === CompanyItem && handle === 11) {
        return assigneeCompanyRef;
      }
      if (entity === PersonEntity && handle === 22) {
        return assigneePersonRef;
      }
      if (entity === PersonEntity && handle === 33) {
        return creatorPersonRef;
      }
      if (entity === EventTypeItem && handle === 'internal') {
        return eventTypeRef;
      }
      if (entity === EventStatusItem && handle === 'scheduled') {
        return eventStatusRef;
      }
      if (entity === CompanyItem && handle === 11) {
        return creatorCompanyRef;
      }

      return { entity, handle };
    });
    const em = {
      create,
      getReference,
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
        type: eventTypeRef,
        status: eventStatusRef,
        assigneeCompany: assigneeCompanyRef,
        assigneePerson: assigneePersonRef,
        creatorCompany: assigneeCompanyRef,
        creatorPerson: creatorPersonRef,
      }),
    );
    expect(getReference).toHaveBeenCalledWith(CompanyItem, 11);
    expect(getReference).toHaveBeenCalledWith(PersonEntity, 22);
    expect(getReference).toHaveBeenCalledWith(PersonEntity, 33);
    expect(getReference).toHaveBeenCalledWith(EventTypeItem, 'internal');
    expect(getReference).toHaveBeenCalledWith(EventStatusItem, 'scheduled');
    expect(participants.add).toHaveBeenCalledWith(assigneePersonRef);
    expect(em.persist).toHaveBeenCalledWith(createdEvent);
    expect(em.flush).toHaveBeenCalled();
  });
});
