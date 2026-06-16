import { ImportService } from './import.service';

describe('ImportService', () => {
  function createService(em: unknown = { findOne: jest.fn() }) {
    return new ImportService(
      em as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        collectCustomFieldsFromFlatPayload: jest.fn(),
      } as never,
      {} as never,
    );
  }

  it('hydrates the import user permissions for queued validation and execution jobs', async () => {
    const currentUser = { handle: 7, roles: [] };
    const em = {
      findOne: jest.fn(async () => currentUser),
    };
    const service = createService(em);

    const result = await (
      service as unknown as {
        findImportUser(userHandle: number): Promise<unknown>;
      }
    ).findImportUser(7);

    expect(result).toBe(currentUser);
    expect(em.findOne).toHaveBeenCalledWith(
      expect.any(Function),
      { handle: 7 },
      {
        populate: [
          'company',
          'roles',
          'roles.stage',
          'roles.permissions',
          'roles.permissions.entity',
        ],
      },
    );
  });

  it('includes the target field and source value when a value mapping is missing', async () => {
    const service = createService();

    await expect(
      (
        service as unknown as {
          applyValueMapping(
            template: unknown[],
            targetField: string,
            value: unknown,
            mappings: unknown[],
          ): Promise<unknown>;
        }
      ).applyValueMapping([], 'status', 'Fremdwert A', [
        {
          targetField: 'status',
          fallback: 'error',
          values: {},
        },
      ]),
    ).rejects.toThrow('import.valueMappingMissing:status:Fremdwert%20A');
  });

  it('loads distinct source values from all import rows with a capped limit', async () => {
    const execute = jest.fn(async () => [
      { value: 'Dr.' },
      { value: 'Prof.' },
      { value: 'Sir' },
    ]);
    const service = createService({
      findOne: jest.fn(async () => ({ handle: 42, headers: ['Titel'] })),
      getConnection: jest.fn(() => ({ execute })),
    });

    const result = await service.getBatchSourceValues(42, 'Titel', 2);

    expect(result).toEqual({
      values: ['Dr.', 'Prof.'],
      isTruncated: true,
    });
    expect(execute).toHaveBeenCalledWith(expect.stringContaining('distinct'), [
      'Titel',
      42,
      3,
    ]);
  });

  it('includes the target field and source value when kept reference values cannot be resolved', async () => {
    const service = createService({
      find: jest.fn(async () => []),
    });

    await expect(
      (
        service as unknown as {
          applyValueMapping(
            template: unknown[],
            targetField: string,
            value: unknown,
            mappings: unknown[],
          ): Promise<unknown>;
        }
      ).applyValueMapping(
        [
          {
            name: 'status',
            isReference: true,
            referenceName: 'ticketStatus',
            kind: 'm:1',
          },
        ],
        'status',
        'Unbekannt',
        [
          {
            targetField: 'status',
            fallback: 'keep',
            values: {},
          },
        ],
      ),
    ).rejects.toThrow('import.valueMappingMissing:status:Unbekannt');
  });

  it('uses reference field defaults when the mapped source cell is blank', async () => {
    const service = createService();
    const template = [
      {
        name: 'country',
        type: 'CountryItem',
        isReference: true,
        referenceName: 'country',
        kind: 'm:1',
        isRequired: true,
      },
    ];

    const payload = await (
      service as unknown as {
        buildPayload(
          template: unknown[],
          rawData: Record<string, unknown>,
          dto: unknown,
          entityHandle: string,
          currentUser: unknown,
        ): Promise<Record<string, unknown>>;
        getMissingRequiredFieldNames(
          template: unknown[],
          payload: Record<string, unknown>,
          action: string | null,
        ): string[];
      }
    ).buildPayload(
      template,
      { Land: '' },
      {
        entityHandle: 'company',
        mappings: [{ sourceColumn: 'Land', targetField: 'country' }],
        fieldDefaults: [
          {
            targetField: 'country',
            value: { handle: 'DE', name: 'Deutschland' },
          },
        ],
      },
      'company',
      { handle: 7 },
    );

    expect(payload.country).toBe('DE');
    expect(
      (
        service as unknown as {
          getMissingRequiredFieldNames(
            template: unknown[],
            payload: Record<string, unknown>,
            action: string | null,
          ): string[];
        }
      ).getMissingRequiredFieldNames(template, payload, 'created'),
    ).toEqual([]);
  });
});
