import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { GenericCustomFieldService } from './generic-custom-field.service';
import type { CustomFieldDefinitionItem } from '../../entity/CustomFieldDefinitionItem';
import type { CustomFieldType } from '../../entity/CustomFieldTypeItem';

const createDefinition = (
  fieldKey: string,
  fieldType: CustomFieldType,
  overrides: Partial<CustomFieldDefinitionItem> = {},
): CustomFieldDefinitionItem =>
  ({
    handle: overrides.handle ?? fieldKey,
    fieldKey,
    fieldType,
    label: fieldKey,
    isRequired: false,
    isActive: true,
    fieldOrder: 0,
    selectOptions: null,
    ...overrides,
  }) as unknown as CustomFieldDefinitionItem;

const createService = (definitions: CustomFieldDefinitionItem[] = []) => {
  const em = {
    find: jest
      .fn<() => Promise<CustomFieldDefinitionItem[]>>()
      .mockResolvedValue(definitions),
  };

  return new GenericCustomFieldService(em as never);
};

describe('GenericCustomFieldService', () => {
  it('splits nested and flat custom fields out of mutation payloads', () => {
    const service = createService();

    const result = service.splitPayload({
      title: 'Company',
      customFields: { region: 'emea' },
      'customFields.priority': 'high',
    });

    expect(result.data).toEqual({ title: 'Company' });
    expect(result.customFields).toEqual({
      region: 'emea',
      priority: 'high',
    });
  });

  it('collects flat import fields into customFields and removes flat keys', () => {
    const service = createService();
    const payload: Record<string, unknown> = {
      title: 'Company',
      'customFields.priority': 'high',
    };

    const customFields = service.collectCustomFieldsFromFlatPayload(payload);

    expect(customFields).toEqual({ priority: 'high' });
    expect(payload).toEqual({
      title: 'Company',
      customFields: { priority: 'high' },
    });
  });

  it('validates required custom fields after type normalization', async () => {
    const service = createService([
      createDefinition('status', 'select', {
        isRequired: true,
        selectOptions: [{ label: 'Active', value: 'active' }],
      }),
      createDefinition('score', 'number', {
        isRequired: true,
      }),
    ]);

    await expect(
      service.assertRequiredFields('company', {
        status: 'unknown',
        score: '42',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.assertRequiredFields('company', {
        status: 'active',
        score: 'not-a-number',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.assertRequiredFields('company', {
        status: 'active',
        score: '42',
      }),
    ).resolves.toBeUndefined();
  });
});
