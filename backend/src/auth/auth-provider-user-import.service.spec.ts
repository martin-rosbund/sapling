import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { AuthProviderUserImportService } from './auth-provider-user-import.service';
import { CompanyItem } from '../entity/CompanyItem';
import { PersonItem } from '../entity/PersonItem';
import { PersonSessionItem } from '../entity/PersonSessionItem';
import { PersonTypeItem } from '../entity/PersonTypeItem';
import { RoleItem } from '../entity/RoleItem';

function createRolesCollection(initial: RoleItem[] = []) {
  const items = [...initial];
  return {
    items,
    contains: jest.fn((role: RoleItem) => items.includes(role)),
    add: jest.fn((role: RoleItem) => {
      if (!items.includes(role)) {
        items.push(role);
      }
    }),
  };
}

function createService(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const em = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    persist: jest.fn(),
    flush: jest.fn(),
    ...overrides,
  };

  return {
    em,
    service: new AuthProviderUserImportService(em as never),
  };
}

describe('AuthProviderUserImportService', () => {
  it('maps Azure users to provider users', () => {
    const { service } = createService();

    const result = (
      service as unknown as {
        mapAzureUserToProviderUser: (value: unknown) => unknown;
      }
    ).mapAzureUserToProviderUser({
      id: 'azure-1',
      displayName: 'Ada Lovelace',
      givenName: 'Ada',
      surname: 'Lovelace',
      mail: null,
      userPrincipalName: 'ada@example.com',
    });

    expect(result).toEqual({
      provider: 'azure',
      id: 'azure-1',
      displayName: 'Ada Lovelace',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      userPrincipalName: 'ada@example.com',
    });
  });

  it('maps Google users to provider users', () => {
    const { service } = createService();

    const result = (
      service as unknown as {
        mapGoogleUserToProviderUser: (value: unknown) => unknown;
      }
    ).mapGoogleUserToProviderUser({
      id: 'google-1',
      primaryEmail: 'grace@example.com',
      name: {
        givenName: 'Grace',
        familyName: 'Hopper',
        fullName: 'Grace Hopper',
      },
    });

    expect(result).toEqual({
      provider: 'google',
      id: 'google-1',
      displayName: 'Grace Hopper',
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      userPrincipalName: 'grace@example.com',
    });
  });

  it('matches provider users by substring across name and email fields', () => {
    const { service } = createService();
    const matchesSearch = (
      service as unknown as {
        providerUserMatchesSearch: (value: unknown, search?: string) => boolean;
      }
    ).providerUserMatchesSearch;
    const user = {
      provider: 'azure',
      id: 'bc106372-6994-4987-a7cc-c6c9010ca5a7',
      displayName: 'ISB - Kasse',
      firstName: null,
      lastName: null,
      email: 'kasse@isb-solutions.de',
      userPrincipalName: 'kasse@isb-solutions.de',
    };

    expect(matchesSearch(user, 'kasse')).toBe(true);
    expect(matchesSearch(user, 'solutions')).toBe(true);
    expect(matchesSearch(user, 'no-match')).toBe(false);
  });

  it('creates provider people and assigns selected roles', async () => {
    const { em, service } = createService();
    const session = { accessToken: 'token' };
    const personType = { handle: 'azure' } as PersonTypeItem;
    const role = { handle: 7, title: 'Support' } as RoleItem;
    const roles = createRolesCollection();
    const createdPerson = { roles } as unknown as PersonItem;

    em.findOne.mockImplementation(async (entity, where) => {
      if (entity === PersonSessionItem) return session;
      if (entity === PersonTypeItem) return personType;
      if (entity === PersonItem && 'loginName' in where) return null;
      if (entity === PersonItem && 'email' in where) return null;
      return null;
    });
    em.find.mockResolvedValue([role]);
    em.create.mockReturnValue(createdPerson);
    jest
      .spyOn(
        service as unknown as {
          getAzureUserWithRetry: (
            session: PersonSessionItem,
            userId: string,
          ) => Promise<unknown>;
        },
        'getAzureUserWithRetry',
      )
      .mockResolvedValue({
        provider: 'azure',
        id: 'azure-1',
        displayName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      });

    const result = await service.importProviderUsers(
      { handle: 1, type: { handle: 'azure' } } as PersonItem,
      { provider: 'azure', userIds: ['azure-1'], roleHandles: [7] },
    );

    expect(result.created).toBe(1);
    expect(em.create).toHaveBeenCalledWith(
      PersonItem,
      expect.objectContaining({
        loginName: 'azure-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        type: personType,
        isActive: true,
      }),
    );
    expect(roles.add).toHaveBeenCalledWith(role);
    expect(em.persist).toHaveBeenCalledWith(createdPerson);
    expect(em.flush).toHaveBeenCalled();
  });

  it('updates existing provider people and keeps existing roles', async () => {
    const { em, service } = createService();
    const session = { accessToken: 'token' };
    const personType = { handle: 'google' } as PersonTypeItem;
    const existingRole = { handle: 3, title: 'Sales' } as RoleItem;
    const newRole = { handle: 8, title: 'Admin' } as RoleItem;
    const roles = createRolesCollection([existingRole]);
    const existingPerson = {
      handle: 9,
      loginName: 'old',
      firstName: 'Old',
      lastName: 'Name',
      email: 'old@example.com',
      roles,
    } as unknown as PersonItem;

    em.findOne.mockImplementation(async (entity, where) => {
      if (entity === PersonSessionItem) return session;
      if (entity === PersonTypeItem) return personType;
      if (entity === PersonItem && 'loginName' in where) return existingPerson;
      return null;
    });
    em.find.mockResolvedValue([existingRole, newRole]);
    jest
      .spyOn(
        service as unknown as {
          getGoogleUserWithRetry: (
            session: PersonSessionItem,
            userId: string,
          ) => Promise<unknown>;
        },
        'getGoogleUserWithRetry',
      )
      .mockResolvedValue({
        provider: 'google',
        id: 'google-1',
        displayName: 'Grace Hopper',
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
      });

    const result = await service.importProviderUsers(
      { handle: 1, type: { handle: 'google' } } as PersonItem,
      { provider: 'google', userIds: ['google-1'], roleHandles: [3, 8] },
    );

    expect(result.updated).toBe(1);
    expect(existingPerson.loginName).toBe('google-1');
    expect(existingPerson.firstName).toBe('Grace');
    expect(existingPerson.lastName).toBe('Hopper');
    expect(existingPerson.email).toBe('grace@example.com');
    expect(existingPerson.isActive).toBe(true);
    expect(roles.add).toHaveBeenCalledTimes(1);
    expect(roles.add).toHaveBeenCalledWith(newRole);
  });

  it('assigns the selected company to imported people', async () => {
    const { em, service } = createService();
    const session = { accessToken: 'token' };
    const personType = { handle: 'azure' } as PersonTypeItem;
    const role = { handle: 7, title: 'Support' } as RoleItem;
    const company = { handle: 12, name: 'ISB Solutions' } as CompanyItem;
    const roles = createRolesCollection();
    const createdPerson = { roles } as unknown as PersonItem;

    em.findOne.mockImplementation(async (entity, where) => {
      if (entity === PersonSessionItem) return session;
      if (entity === PersonTypeItem) return personType;
      if (entity === CompanyItem && where.handle === 12) return company;
      if (entity === PersonItem && 'loginName' in where) return null;
      if (entity === PersonItem && 'email' in where) return null;
      return null;
    });
    em.find.mockResolvedValue([role]);
    em.create.mockReturnValue(createdPerson);
    jest
      .spyOn(
        service as unknown as {
          getAzureUserWithRetry: (
            session: PersonSessionItem,
            userId: string,
          ) => Promise<unknown>;
        },
        'getAzureUserWithRetry',
      )
      .mockResolvedValue({
        provider: 'azure',
        id: 'azure-1',
        displayName: 'Ada Lovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      });

    await service.importProviderUsers(
      { handle: 1, type: { handle: 'azure' } } as PersonItem,
      {
        provider: 'azure',
        userIds: ['azure-1'],
        roleHandles: [7],
        companyHandle: 12,
      },
    );

    expect(em.create).toHaveBeenCalledWith(
      PersonItem,
      expect.objectContaining({
        company,
      }),
    );
  });

  it('rejects importing a provider different from the current login provider', async () => {
    const { service } = createService();

    await expect(
      service.listProviderUsers(
        { handle: 1, type: { handle: 'google' } } as PersonItem,
        'azure',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('retries transient Azure directory failures', async () => {
    const { service } = createService();
    const transientError = Object.assign(new Error('fetch failed'), {
      code: 'TypeError',
    });
    const listAzureUsers = jest
      .spyOn(
        service as unknown as {
          listAzureUsers: jest.Mock;
        },
        'listAzureUsers',
      )
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce({ users: [], nextPageToken: null });
    jest
      .spyOn(
        service as unknown as {
          waitForProviderRetry: jest.Mock;
        },
        'waitForProviderRetry',
      )
      .mockResolvedValue(undefined);

    const result = await (
      service as unknown as {
        listAzureUsersWithRetry: (
          session: PersonSessionItem,
          options: { search?: string; pageToken?: string },
        ) => Promise<unknown>;
      }
    ).listAzureUsersWithRetry(
      { accessToken: 'token' } as PersonSessionItem,
      {},
    );

    expect(result).toEqual({ users: [], nextPageToken: null });
    expect(listAzureUsers).toHaveBeenCalledTimes(2);
  });

  it('returns a translated provider error after repeated Azure directory failures', async () => {
    const { service } = createService();
    const transientError = Object.assign(new Error('fetch failed'), {
      code: 'TypeError',
    });
    jest
      .spyOn(
        service as unknown as {
          listAzureUsers: jest.Mock;
        },
        'listAzureUsers',
      )
      .mockRejectedValue(transientError);
    jest
      .spyOn(
        service as unknown as {
          waitForProviderRetry: jest.Mock;
        },
        'waitForProviderRetry',
      )
      .mockResolvedValue(undefined);

    await expect(
      (
        service as unknown as {
          listAzureUsersWithRetry: (
            session: PersonSessionItem,
            options: { search?: string; pageToken?: string },
          ) => Promise<unknown>;
        }
      ).listAzureUsersWithRetry(
        { accessToken: 'token' } as PersonSessionItem,
        {},
      ),
    ).rejects.toMatchObject({
      message: 'providerUserImport.azureDirectoryUnavailable',
    });
    await expect(
      (
        service as unknown as {
          listAzureUsersWithRetry: (
            session: PersonSessionItem,
            options: { search?: string; pageToken?: string },
          ) => Promise<unknown>;
        }
      ).listAzureUsersWithRetry(
        { accessToken: 'token' } as PersonSessionItem,
        {},
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
