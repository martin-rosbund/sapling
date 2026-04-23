import { describe, expect, it } from '@jest/globals';
import { EncryptedStringType } from '../entity/types/encrypted-string.type';
import {
  decryptString,
  encryptString,
  isEncryptedString,
} from './encrypted-string';

describe('encrypted string persistence', () => {
  const secret = 'unit-test-secret';

  it('round-trips encrypted values through the custom MikroORM type', () => {
    const type = new EncryptedStringType(secret);
    const persisted = type.convertToDatabaseValue(
      'oauth-access-token',
      {} as never,
    );

    expect(persisted).toBeDefined();
    expect(persisted).not.toBe('oauth-access-token');
    expect(isEncryptedString(persisted as string)).toBe(true);
    expect(type.convertToJSValue(persisted, {} as never)).toBe(
      'oauth-access-token',
    );
    expect(type.ensureComparable({} as never, {} as never)).toBe(false);
  });

  it('keeps legacy plaintext rows readable until they are migrated', () => {
    expect(decryptString('legacy-token', secret)).toBe('legacy-token');
  });

  it('decrypts values produced by the helper functions', () => {
    const encrypted = encryptString('oauth-refresh-token', secret);

    expect(encrypted).toBeDefined();
    expect(decryptString(encrypted, secret)).toBe('oauth-refresh-token');
  });
});
