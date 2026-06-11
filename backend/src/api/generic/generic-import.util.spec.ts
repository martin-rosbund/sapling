import { describe, expect, it } from '@jest/globals';
import { extractImportHandle } from './generic-import.util';

describe('generic-import.util', () => {
  it('extracts every non-empty string or numeric import handle', () => {
    expect(extractImportHandle({ handle: 12 })).toBe(12);
    expect(extractImportHandle({ handle: 0 })).toBe(0);
    expect(extractImportHandle({ handle: '12' })).toBe('12');
    expect(extractImportHandle({ handle: ' 12 ' })).toBe('12');
    expect(extractImportHandle({ handle: 'zeppelin-42' })).toBe('zeppelin-42');
    expect(extractImportHandle({ handle: 'neu' })).toBe('neu');
    expect(extractImportHandle({ handle: '' })).toBeNull();
    expect(extractImportHandle({ handle: '   ' })).toBeNull();
    expect(extractImportHandle({ handle: null })).toBeNull();
  });
});
