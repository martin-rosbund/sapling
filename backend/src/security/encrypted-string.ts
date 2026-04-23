import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { getSaplingSecretOrThrow } from './sapling-secret';

const ENCRYPTED_STRING_PREFIX = 'enc:v1:';
const ENCRYPTED_STRING_ALGORITHM = 'aes-256-gcm';
const ENCRYPTED_STRING_IV_LENGTH = 12;

function createEncryptionKey(secret?: string | null): Buffer {
  return createHash('sha256')
    .update(getSaplingSecretOrThrow(secret), 'utf8')
    .digest();
}

export function isEncryptedString(value: string): boolean {
  return value.startsWith(ENCRYPTED_STRING_PREFIX);
}

export function encryptString(
  value: string | null | undefined,
  secret?: string | null,
): string | null | undefined {
  if (value == null) {
    return value;
  }

  if (isEncryptedString(value)) {
    return value;
  }

  const iv = randomBytes(ENCRYPTED_STRING_IV_LENGTH);
  const cipher = createCipheriv(
    ENCRYPTED_STRING_ALGORITHM,
    createEncryptionKey(secret),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_STRING_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptString(
  value: string | null | undefined,
  secret?: string | null,
): string | null | undefined {
  if (value == null || !isEncryptedString(value)) {
    return value;
  }

  const encodedPayload = value.slice(ENCRYPTED_STRING_PREFIX.length);
  const [ivBase64, authTagBase64, encryptedBase64] = encodedPayload.split(':');

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('security.invalidEncryptedString');
  }

  const decipher = createDecipheriv(
    ENCRYPTED_STRING_ALGORITHM,
    createEncryptionKey(secret),
    Buffer.from(ivBase64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
