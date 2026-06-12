import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';
import { PersonItem } from '../../entity/PersonItem';

const createTemplateField = (
  overrides: Partial<EntityTemplateDto>,
): EntityTemplateDto => ({
  name: '',
  type: 'string',
  isPrimaryKey: false,
  isAutoIncrement: false,
  isUnique: false,
  referenceName: '',
  isReference: false,
  isRequired: false,
  nullable: false,
  isPersistent: true,
  referencedPks: [],
  options: [],
  formGroup: null,
  formGroupOrder: null,
  formOrder: null,
  formWidth: null,
  ...overrides,
});

function createCurrentUser(overrides: Partial<PersonItem> = {}): PersonItem {
  return {
    handle: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    company: {
      handle: 42,
      name: 'Analytical Engines Ltd.',
    },
    createdAt: null,
    ...overrides,
  } as PersonItem;
}

describe('GenericFilterService', () => {
  it('normalizes string operators and date filter values for read criteria', () => {
    const service = new GenericFilterService();
    const template = [
      createTemplateField({ name: 'title', type: 'string' }),
      createTemplateField({ name: 'createdAt', type: 'date' }),
    ];

    const result: {
      title: Record<string, unknown>;
      createdAt: Record<string, unknown>;
    } = service.prepareReadCriteria(
      {
        title: { $like: '%Ada%' },
        createdAt: { $gte: '2026-04-01' },
      },
      template,
    );

    expect(result.title).toEqual({ $ilike: '%Ada%' });
    expect(result.createdAt.$gte).toBeInstanceOf(Date);
    expect(result.createdAt.$gte).toEqual(new Date('2026-04-01'));
  });

  it('preserves Date instances in read criteria', () => {
    const service = new GenericFilterService();
    const template = [createTemplateField({ name: 'createdAt', type: 'date' })];
    const lowerBound = new Date('2026-04-01T00:00:00.000Z');

    const result = service.prepareReadCriteria(
      {
        $or: [{ createdAt: { $gte: lowerBound } }, { createdAt: null }],
      },
      template,
    );

    expect(result.$or[0].createdAt?.$gte).toBe(lowerBound);
  });

  it('normalizes date filter values inside nested logical arrays', () => {
    const service = new GenericFilterService();
    const template = [
      createTemplateField({ name: 'startDate', type: 'date' }),
      createTemplateField({ name: 'endDate', type: 'date' }),
      createTemplateField({ name: 'createdAt', type: 'date' }),
      createTemplateField({ name: 'updatedAt', type: 'date' }),
    ];

    const result = service.prepareReadCriteria(
      {
        $and: [
          {
            $or: [
              { startDate: { $lte: '2026-07-31T21:59:59.999Z' } },
              {
                $and: [
                  { startDate: null },
                  { createdAt: { $lte: '2026-07-31T21:59:59.999Z' } },
                ],
              },
            ],
          },
          {
            $or: [
              { endDate: { $gte: '2026-06-30T22:00:00.000Z' } },
              {
                $and: [
                  { endDate: null },
                  { updatedAt: { $gte: '2026-06-30T22:00:00.000Z' } },
                ],
              },
            ],
          },
        ],
      },
      template,
    ) as NestedTimelineFilter;

    expect(result.$and[0]?.$or?.[0]?.startDate?.$lte).toBeInstanceOf(Date);
    expect(result.$and[0]?.$or?.[1]?.$and?.[1]?.createdAt?.$lte).toBeInstanceOf(
      Date,
    );
    expect(result.$and[1]?.$or?.[0]?.endDate?.$gte).toBeInstanceOf(Date);
    expect(result.$and[1]?.$or?.[1]?.$and?.[1]?.updatedAt?.$gte).toBeInstanceOf(
      Date,
    );
  });

  it('resolves supported current-user placeholders before read criteria normalization', () => {
    const service = new GenericFilterService();

    const result = service.prepareReadCriteria(
      {
        assigneePerson: { handle: '{{currentUser.handle}}' },
        company: { handle: '{{currentUser.company.handle}}' },
      },
      [],
      createCurrentUser(),
    ) as unknown as {
      assigneePerson: { handle: number };
      company: { handle: number };
    };

    expect(result.assigneePerson.handle).toBe(7);
    expect(result.company.handle).toBe(42);
  });

  it('rejects ilike filters on non-string fields', () => {
    const service = new GenericFilterService();
    const template = [
      createTemplateField({ name: 'isEscalated', type: 'boolean' }),
    ];

    expect(() =>
      service.prepareReadCriteria(
        {
          isEscalated: { $like: '%true%' },
        },
        template,
      ),
    ).toThrow(BadRequestException);
  });

  it('allows ilike filters on string-like template fields with explicit and length-backed types', () => {
    const service = new GenericFilterService();
    const template = [
      createTemplateField({ name: 'handle', type: 'StringType' }),
      createTemplateField({ name: 'name', type: 'string' }),
      createTemplateField({
        name: 'dialingCode',
        type: 'Object',
        length: 8,
        nullable: true,
      }),
    ];

    const result = service.prepareReadCriteria(
      {
        $or: [
          { handle: { $ilike: '%de%' } },
          { name: { $ilike: '%de%' } },
          { dialingCode: { $ilike: '%de%' } },
        ],
      },
      template,
    );

    expect(result).toEqual({
      $or: [
        { handle: { $ilike: '%de%' } },
        { name: { $ilike: '%de%' } },
        { dialingCode: { $ilike: '%de%' } },
      ],
    });
  });

  it('normalizes date payload values without touching invalid non-date input', () => {
    const service = new GenericFilterService();
    const template = [
      createTemplateField({ name: 'startAt', type: 'datetime' }),
      createTemplateField({ name: 'endAt', type: 'datetime' }),
    ];

    const result = service.normalizeDatePayload(
      {
        startAt: '2026-04-29T08:30:00.000Z',
        endAt: '   ',
        title: 'Keep me',
      },
      template,
    );

    expect(result.startAt).toBeInstanceOf(Date);
    expect(result.startAt).toEqual(new Date('2026-04-29T08:30:00.000Z'));
    expect(result.endAt).toBeNull();
    expect(result.title).toBe('Keep me');
  });
});

type DateOperatorFilter = {
  $gte?: unknown;
  $lte?: unknown;
};

type NestedTimelineFilterNode = {
  $and?: NestedTimelineFilterNode[];
  $or?: NestedTimelineFilterNode[];
  createdAt?: DateOperatorFilter;
  endDate?: DateOperatorFilter;
  startDate?: DateOperatorFilter;
  updatedAt?: DateOperatorFilter;
};

type NestedTimelineFilter = {
  $and: NestedTimelineFilterNode[];
};
