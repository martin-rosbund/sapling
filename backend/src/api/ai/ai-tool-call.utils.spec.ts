import { describe, expect, it } from '@jest/globals';
import { resolveMaxToolCallIterations } from './ai-tool-call.utils';

describe('resolveMaxToolCallIterations', () => {
  it('uses 100 as the default fallback', () => {
    expect(
      resolveMaxToolCallIterations({ maxToolCallIterations: null } as never),
    ).toBe(100);
  });

  it('keeps configured positive values', () => {
    expect(
      resolveMaxToolCallIterations({ maxToolCallIterations: 100 } as never),
    ).toBe(100);
  });
});
