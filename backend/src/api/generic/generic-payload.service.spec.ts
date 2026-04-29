import { describe, expect, it, jest } from '@jest/globals';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericPayloadService } from './generic-payload.service';
import { GenericReferenceService } from './generic-reference.service';

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

describe('GenericPayloadService', () => {
  it('removes auto-increment and read-only fields on create payloads', () => {
    const referenceService = {
      reduceReferenceFields: jest.fn(
        (_template: EntityTemplateDto[], data: object) => data,
      ),
    };
    const service = new GenericPayloadService(
      referenceService as unknown as GenericReferenceService,
    );

    const result = service.prepareCreatePayload(
      [
        createTemplateField({
          name: 'handle',
          type: 'number',
          isAutoIncrement: true,
        }),
        createTemplateField({ name: 'title', type: 'string' }),
        createTemplateField({
          name: 'status',
          type: 'string',
          options: ['isReadOnly'],
        }),
      ],
      {
        handle: 7,
        title: 'Open',
        status: 'internal',
      },
    );

    expect(result).toEqual({
      title: 'Open',
    });
  });

  it('keeps non-readonly handles on update payloads while still removing readonly fields', () => {
    const referenceService = {
      reduceReferenceFields: jest.fn(
        (_template: EntityTemplateDto[], data: object) => data,
      ),
    };
    const service = new GenericPayloadService(
      referenceService as unknown as GenericReferenceService,
    );

    const result = service.prepareUpdatePayload(
      [
        createTemplateField({
          name: 'handle',
          type: 'number',
          isAutoIncrement: true,
        }),
        createTemplateField({ name: 'title', type: 'string' }),
        createTemplateField({
          name: 'status',
          type: 'string',
          options: ['isReadOnly'],
        }),
      ],
      {
        handle: 7,
        title: 'Changed',
        status: 'internal',
      },
    );

    expect(result).toEqual({
      handle: 7,
      title: 'Changed',
    });
  });

  it('builds merged dependency payloads for reference validation', () => {
    const referenceService = {
      reduceReferenceFields: jest.fn(),
    };
    const service = new GenericPayloadService(
      referenceService as unknown as GenericReferenceService,
    );

    expect(
      service.buildDependencyValidationPayload(
        { handle: 7, company: 1, title: 'Before' },
        { title: 'After' },
      ),
    ).toEqual({
      handle: 7,
      company: 1,
      title: 'After',
    });
  });
});
