import { CurrentMetadataService } from './current-metadata.service';

describe('CurrentMetadataService', () => {
  it('hydrates the current user before resolving form config and permissions', async () => {
    const requestUser = {
      handle: 1,
      get roles(): never {
        throw new Error(
          'Collection<RoleItem> of entity PersonItem[1] not initialized',
        );
      },
    };
    const hydratedUser = { handle: 1, roles: [] };
    const entity = { handle: 'importBatchRow' };
    const baseTemplates = [{ name: 'rowNumber' }];
    const effectiveTemplates = [{ name: 'rowNumber', formVisible: true }];
    const entityPermission = {
      entityHandle: 'importBatchRow',
      allowRead: true,
    };

    const service = new CurrentMetadataService(
      {
        findOne: jest.fn(() => Promise.resolve(entity)),
      } as never,
      {
        getEntityTemplate: jest.fn(() => baseTemplates),
      } as never,
      {
        getPerson: jest.fn(() => Promise.resolve(hydratedUser)),
        getEntityPermissions: jest.fn(() => entityPermission),
      } as never,
      {
        getEffectiveTemplate: jest.fn(() =>
          Promise.resolve(effectiveTemplates),
        ),
      } as never,
      {
        appendCustomFieldTemplates: jest.fn(
          (_entityHandle: string, templates: typeof effectiveTemplates) =>
            Promise.resolve(templates),
        ),
      } as never,
    );

    await expect(
      service.getEntityMetadata(requestUser as never, ['importBatchRow']),
    ).resolves.toEqual([
      {
        entityHandle: 'importBatchRow',
        entity,
        entityPermission,
        entityTemplates: effectiveTemplates,
      },
    ]);
  });
});
