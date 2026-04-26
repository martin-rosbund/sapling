import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ScriptResultClientMethods } from './core/script.result.client';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { PersonController } from './PersonController';
import type { PersonItem } from '../entity/PersonItem';
import { ScriptResultServerMethods } from './core/script.result.server';

describe('PersonController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('removes empty login passwords and returns overwrite', async () => {
    const items = [
      { handle: 1, loginPassword: '' },
      { handle: 2, loginPassword: 'hashed-value' },
    ] as PersonItem[];
    const controller = new PersonController(
      { handle: 'person' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.beforeUpdate(items);

    expect('loginPassword' in items[0]).toBe(false);
    expect(items[1].loginPassword).toBe('hashed-value');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });

  it('pseudonymizes people while keeping the record handles', async () => {
    const session = { handle: 3 };
    const apiToken = { isActive: true, allowedIps: ['127.0.0.1'] };
    const socialMediaProfile = {
      title: 'Original',
      username: 'original-user',
      externalId: '123',
      notes: 'private',
      url: 'https://social.example/profile',
    };
    const loadedPerson = {
      handle: 5,
      firstName: 'Anna',
      lastName: 'Muster',
      loginName: 'anna.muster',
      loginPassword: 'secret',
      phone: '+491234',
      mobile: '+491235',
      email: 'anna@example.com',
      birthDay: new Date('1990-05-01T00:00:00.000Z'),
      isActive: true,
      sendNewsletter: true,
      requirePasswordChange: false,
      socialMediaProfiles: [socialMediaProfile],
      apiTokens: [apiToken],
      session,
    } as PersonItem;
    const em = {
      findOne: jest.fn().mockResolvedValue(loadedPerson),
      flush: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn(),
    };
    const controller = new PersonController(
      { handle: 'person' } as never,
      { handle: 99 } as never,
      em as never,
    );

    const result = await controller.execute(
      [{ handle: 5 }] as object[],
      'pseudonymize',
    );

    expect(loadedPerson.handle).toBe(5);
    expect(loadedPerson.firstName).toBe('Pseudonym');
    expect(loadedPerson.lastName).toBe('Person 000005');
    expect(loadedPerson.loginName).toBe('pseudonym-person-5');
    expect(loadedPerson.loginPassword).toBeUndefined();
    expect(loadedPerson.email).toBe('pseudonym-person-5@example.invalid');
    expect(loadedPerson.phone).toBe('+000000005');
    expect(loadedPerson.mobile).toBe('+0009000005');
    expect(loadedPerson.isActive).toBe(false);
    expect(loadedPerson.sendNewsletter).toBe(false);
    expect(loadedPerson.requirePasswordChange).toBe(true);
    expect(loadedPerson.birthDay?.toISOString()).toBe(
      '1970-01-06T00:00:00.000Z',
    );
    expect(socialMediaProfile.username).toBe('pseudonym-000005');
    expect(socialMediaProfile.url).toBe(
      'https://example.invalid/pseudonym-000005',
    );
    expect(apiToken.isActive).toBe(false);
    expect(apiToken.allowedIps).toEqual([]);
    expect(em.remove).toHaveBeenCalledWith(session);
    expect(em.flush).toHaveBeenCalled();
    expect(result.method).toBe(ScriptResultClientMethods.setItemData);
    expect(result.item).toBe(loadedPerson);
  });
});
