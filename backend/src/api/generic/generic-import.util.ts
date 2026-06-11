import { EntityTemplateDto } from '../template/dto/entity-template.dto';

export type GenericImportAction = 'created' | 'updated' | 'failed' | 'skipped';

export type GenericImportRowResult = {
  rowNumber: number;
  action: GenericImportAction;
  handle?: string | number | null;
  message?: string;
};

export type GenericImportResponse = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: GenericImportRowResult[];
};

export function hasImportableRowValues(
  row: unknown,
): row is Record<string, unknown> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return false;
  }

  return Object.values(row).some(
    (value) => value != null && String(value).trim().length > 0,
  );
}

export function normalizeImportRow(
  template: EntityTemplateDto[],
  row: Record<string, unknown>,
): { createdAt?: Date; updatedAt?: Date; [key: string]: any } {
  const templateByName = new Map(template.map((field) => [field.name, field]));
  const payload: { createdAt?: Date; updatedAt?: Date; [key: string]: any } =
    {};

  for (const [key, value] of Object.entries(row)) {
    const field = templateByName.get(key);

    if (!field || shouldSkipImportField(field)) {
      continue;
    }

    payload[key] = normalizeImportValue(field, value);
  }

  return payload;
}

export function extractImportHandle(
  payload: Record<string, unknown>,
): string | number | null {
  const handle = payload.handle;

  if (typeof handle === 'number') {
    return Number.isFinite(handle) ? handle : null;
  }

  if (typeof handle !== 'string') {
    return null;
  }

  const trimmedHandle = handle.trim();
  return trimmedHandle ? trimmedHandle : null;
}

export function getImportErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const response = (error as { response?: unknown }).response;
    if (typeof response === 'string') {
      return response;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'exception.unknownError';
}

function shouldSkipImportField(field: EntityTemplateDto): boolean {
  if (!field.name || field.isPersistent === false) {
    return true;
  }

  if (field.options?.includes('isReadOnly')) {
    return true;
  }

  if (field.kind && ['1:m', 'm:n', 'n:m', '1:1'].includes(field.kind)) {
    return true;
  }

  return false;
}

function normalizeImportValue(
  field: EntityTemplateDto,
  value: unknown,
): unknown {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (field.type === 'boolean') {
    return normalizeBoolean(trimmedValue) ?? trimmedValue;
  }

  if (isImportNumberField(field)) {
    const normalizedNumber = Number(
      trimmedValue.includes(',') && !trimmedValue.includes('.')
        ? trimmedValue.replace(',', '.')
        : trimmedValue,
    );
    return Number.isFinite(normalizedNumber) ? normalizedNumber : trimmedValue;
  }

  return trimmedValue;
}

export function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function isImportNumberField(field: EntityTemplateDto): boolean {
  return [
    'number',
    'float',
    'double',
    'decimal',
    'real',
    'int',
    'integer',
    'smallint',
    'bigint',
  ].includes(field.type);
}
