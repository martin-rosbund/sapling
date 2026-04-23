import {
  Type,
  type EntityMetadata,
  type EntityProperty,
  type Platform,
} from '@mikro-orm/core';
import { decryptString, encryptString } from '../../security/encrypted-string';

export class EncryptedStringType extends Type<
  string | null | undefined,
  string | null | undefined
> {
  constructor(private readonly secret?: string | null) {
    super();
  }

  override convertToDatabaseValue(
    value: string | null | undefined,
    platform: Platform,
  ): string | null | undefined {
    void platform;
    return encryptString(value, this.secret);
  }

  override convertToJSValue(
    value: string | null | undefined,
    platform: Platform,
  ): string | null | undefined {
    void platform;
    return decryptString(value, this.secret);
  }

  override compareAsType(): string {
    return 'string';
  }

  override compareValues(
    a: string | null | undefined,
    b: string | null | undefined,
  ): boolean {
    return a === b;
  }

  override ensureComparable<T extends object>(
    meta: EntityMetadata<T>,
    prop: EntityProperty<T>,
  ): boolean {
    void meta;
    void prop;
    return false;
  }

  override get runtimeType(): string {
    return 'string';
  }

  override getColumnType(prop: EntityProperty, platform: Platform): string {
    void prop;
    void platform;
    return 'text';
  }
}
