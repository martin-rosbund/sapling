import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';

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

describe('GenericFilterService', () => {
  it('normalizes string operators and date filter values for read criteria', () => {
    const service = new GenericFilterService();
    const template = [
      createTemplateField({ name: 'title', type: 'string' }),
      createTemplateField({ name: 'createdAt', type: 'date' }),
    ];

    const result = service.prepareReadCriteria(
      {
        title: { $like: '%Ada%' },
        createdAt: { $gte: '2026-04-01' },
      },
      template,
    ) as {
      title: Record<string, unknown>;
      createdAt: Record<string, unknown>;
    };

    expect(result.title).toEqual({ $ilike: '%Ada%' });
    expect(result.createdAt.$gte).toBeInstanceOf(Date);
    expect(result.createdAt.$gte).toEqual(new Date('2026-04-01'));
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
