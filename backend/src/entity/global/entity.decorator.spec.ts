import { describe, expect, it } from '@jest/globals';

import {
  Sapling,
  SaplingForm,
  SaplingGenericReference,
  SaplingReferenceTemplate,
  getSaplingFormLayout,
  getSaplingGenericReference,
  getSaplingOptions,
  getSaplingReferenceTemplate,
} from './entity.decorator';

describe('entity.decorator', () => {
  class ExampleEntity {
    @Sapling(['isValue'])
    @SaplingForm({
      group: ' details ',
      order: 7.9,
      width: 3.4 as never,
      visible: false,
      tableOrder: 12.9,
      tableVisible: false,
      mobileOrder: 3.9,
      mobileVisible: true,
    })
    title!: string;

    @SaplingForm({ group: '   ', order: Number.NaN, width: 99 as never })
    description!: string;

    @SaplingForm({ width: 2 })
    compact!: string;

    @SaplingGenericReference({
      entityField: ' entity ',
      handleField: ' reference ',
    })
    genericReference!: string;

    @SaplingReferenceTemplate([
      {
        sourceField: ' bodyMarkdown ',
        targetField: ' description ',
      },
      {
        sourceField: ' estimatedHours ',
        targetField: ' effort ',
        overwrite: false,
      },
    ])
    template!: string;
  }

  it('stores normalized form layout metadata without affecting sapling options', () => {
    expect(getSaplingOptions(ExampleEntity.prototype, 'title')).toEqual([
      'isValue',
    ]);

    expect(getSaplingFormLayout(ExampleEntity.prototype, 'title')).toEqual({
      group: 'details',
      groupOrder: null,
      order: 7,
      width: 3,
      formVisible: false,
      tableOrder: 12,
      tableVisible: false,
      mobileOrder: 3,
      mobileVisible: true,
    });
  });

  it('returns sane defaults for missing or invalid form layout metadata', () => {
    expect(
      getSaplingFormLayout(ExampleEntity.prototype, 'description'),
    ).toEqual({
      group: null,
      groupOrder: null,
      order: null,
      width: 4,
      formVisible: null,
      tableOrder: null,
      tableVisible: null,
      mobileOrder: null,
      mobileVisible: null,
    });

    expect(getSaplingFormLayout(ExampleEntity.prototype, 'missing')).toEqual({
      group: null,
      groupOrder: null,
      order: null,
      width: null,
      formVisible: null,
      tableOrder: null,
      tableVisible: null,
      mobileOrder: null,
      mobileVisible: null,
    });
  });

  it('supports partial form options without forcing unspecified values', () => {
    expect(getSaplingFormLayout(ExampleEntity.prototype, 'compact')).toEqual({
      group: null,
      groupOrder: null,
      order: null,
      width: 2,
      formVisible: null,
      tableOrder: null,
      tableVisible: null,
      mobileOrder: null,
      mobileVisible: null,
    });
  });

  it('stores normalized generic reference metadata', () => {
    expect(
      getSaplingGenericReference(ExampleEntity.prototype, 'genericReference'),
    ).toEqual({
      entityField: 'entity',
      handleField: 'reference',
    });

    expect(
      getSaplingGenericReference(ExampleEntity.prototype, 'missing'),
    ).toBeNull();
  });

  it('stores normalized reference template mappings', () => {
    expect(
      getSaplingReferenceTemplate(ExampleEntity.prototype, 'template'),
    ).toEqual({
      mappings: [
        {
          sourceField: 'bodyMarkdown',
          targetField: 'description',
          overwrite: undefined,
        },
        {
          sourceField: 'estimatedHours',
          targetField: 'effort',
          overwrite: false,
        },
      ],
    });

    expect(
      getSaplingReferenceTemplate(ExampleEntity.prototype, 'missing'),
    ).toBeNull();
  });
});
