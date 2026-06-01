import { describe, expect, it, jest } from '@jest/globals';

import { FormConfigService } from './form-config.service';
import { SAPLING_FORM_CONFIG_SCHEMA } from './form-config.types';
import type { EntityTemplateDto } from '../template/dto/entity-template.dto';

function createTemplate(
  overrides: Partial<EntityTemplateDto>,
): EntityTemplateDto {
  return {
    name: 'title',
    type: 'string',
    isPrimaryKey: false,
    isAutoIncrement: false,
    isUnique: false,
    referenceName: '',
    isReference: false,
    isRequired: false,
    nullable: true,
    isPersistent: true,
    referencedPks: [],
    options: [],
    formGroup: null,
    formGroupOrder: null,
    formOrder: null,
    formWidth: null,
    ...overrides,
  };
}

describe('FormConfigService', () => {
  it('normalizes table and mobile field configuration', () => {
    const service = new FormConfigService({} as never);

    const result = service.validateConfig(
      'ticket',
      {
        schema: SAPLING_FORM_CONFIG_SCHEMA,
        entityHandle: 'ticket',
        fields: {
          title: {
            visible: false,
            tableVisible: false,
            tableOrder: 20.8,
            mobileVisible: true,
            mobileOrder: 5.2,
          },
        },
      },
      [createTemplate({ name: 'title' })],
    );

    expect(result.isValid).toBe(true);
    expect(result.normalizedConfig.fields?.title).toMatchObject({
      visible: false,
      tableVisible: false,
      tableOrder: 20,
      mobileVisible: true,
      mobileOrder: 5,
    });
  });

  it('applies table and mobile configuration to effective templates', async () => {
    const em = {
      find: jest.fn<() => Promise<object[]>>().mockResolvedValue([
        {
          handle: 1,
          scope: 'global',
          isActive: true,
          isDefault: true,
          config: {
            schema: SAPLING_FORM_CONFIG_SCHEMA,
            entityHandle: 'ticket',
            fields: {
              title: {
                visible: false,
                tableVisible: false,
                tableOrder: 30,
                mobileVisible: true,
                mobileOrder: 10,
              },
            },
          },
        },
      ]),
    };
    const service = new FormConfigService(em as never);

    const [template] = await service.getEffectiveTemplate(
      'ticket',
      [createTemplate({ name: 'title' })],
      null,
    );

    expect(template).toMatchObject({
      formVisible: false,
      tableVisible: false,
      tableOrder: 30,
      mobileVisible: true,
      mobileOrder: 10,
      formConfig: expect.objectContaining({
        visible: false,
        tableVisible: false,
        mobileVisible: true,
      }),
    });
  });
});
