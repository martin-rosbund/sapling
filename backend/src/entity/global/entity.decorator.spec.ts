import { describe, expect, it } from '@jest/globals';

import {
  Sapling,
  SaplingForm,
  getSaplingFormLayout,
  getSaplingOptions,
} from './entity.decorator';

describe('entity.decorator', () => {
  class ExampleEntity {
    @Sapling(['isShowInCompact'])
    @SaplingForm({ group: ' details ', order: 7.9, width: 3.4 })
    title!: string;

    @SaplingForm({ group: '   ', order: Number.NaN, width: 99 })
    description!: string;

    @SaplingForm({ width: 2 })
    compact!: string;
  }

  it('stores normalized form layout metadata without affecting sapling options', () => {
    expect(getSaplingOptions(ExampleEntity.prototype, 'title')).toEqual([
      'isShowInCompact',
    ]);

    expect(getSaplingFormLayout(ExampleEntity.prototype, 'title')).toEqual({
      group: 'details',
      order: 7,
      width: 3,
    });
  });

  it('returns sane defaults for missing or invalid form layout metadata', () => {
    expect(
      getSaplingFormLayout(ExampleEntity.prototype, 'description'),
    ).toEqual({
      group: null,
      order: null,
      width: 4,
    });

    expect(getSaplingFormLayout(ExampleEntity.prototype, 'missing')).toEqual({
      group: null,
      order: null,
      width: null,
    });
  });

  it('supports partial form options without forcing unspecified values', () => {
    expect(getSaplingFormLayout(ExampleEntity.prototype, 'compact')).toEqual({
      group: null,
      order: null,
      width: 2,
    });
  });
});
