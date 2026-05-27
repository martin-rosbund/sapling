import { EntityTemplateDto } from '../template/dto/entity-template.dto';

export type ChangeLogPayload = Record<string, unknown> | null;
export type ChangeLogAction = 'create' | 'update' | 'delete';
export type ChangeLogDetail = {
  property: string;
  oldValue: unknown;
  newValue: unknown;
};

const CHANGE_LOG_DETAIL_IGNORED_FIELDS = new Set(['updatedAt']);

export function mergeChangeLogPayloadShape(
  ...payloads: ChangeLogPayload[]
): ChangeLogPayload {
  const shape: Record<string, unknown> = {};

  for (const payload of payloads) {
    const record = asChangeLogRecord(payload);
    for (const key of Object.keys(record)) {
      shape[key] = record[key];
    }
  }

  return Object.keys(shape).length > 0 ? shape : null;
}

export function normalizeConcurrencyBasePayload(
  value: unknown,
): ChangeLogPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return normalizeChangeLogPayload(value as Record<string, unknown>);
}

export function normalizeConcurrencyTimestamp(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const rawValue = String(value).trim();
  if (!rawValue) {
    return null;
  }

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime())
    ? rawValue
    : parsedDate.toISOString();
}

export function buildChangeLogDetails(
  action: ChangeLogAction,
  oldPayload: ChangeLogPayload,
  newPayload: ChangeLogPayload,
): ChangeLogDetail[] {
  const oldRecord = asChangeLogRecord(oldPayload);
  const newRecord = asChangeLogRecord(newPayload);
  const propertyNames =
    action === 'delete'
      ? new Set(Object.keys(oldRecord))
      : new Set(Object.keys(newRecord));
  const details: ChangeLogDetail[] = [];

  [...propertyNames]
    .sort((left, right) => left.localeCompare(right))
    .forEach((property) => {
      if (CHANGE_LOG_DETAIL_IGNORED_FIELDS.has(property)) {
        return;
      }

      const oldValue = normalizeChangeLogValue(oldRecord[property]);
      const newValue = normalizeChangeLogValue(newRecord[property]);

      if (areChangeLogValuesEqual(oldValue, newValue)) {
        return;
      }

      details.push({
        property,
        oldValue,
        newValue,
      });
    });

  return details;
}

export function areChangeLogValuesEqual(
  left: unknown,
  right: unknown,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function areUpdateConflictValuesEqual(
  left: unknown,
  right: unknown,
): boolean {
  return (
    JSON.stringify(normalizeUpdateConflictValue(left)) ===
    JSON.stringify(normalizeUpdateConflictValue(right))
  );
}

export function normalizeUpdateConflictValue(
  value: unknown,
  visited = new WeakMap<object, unknown>(),
): unknown {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0 ? null : value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeUpdateConflictValue(entry, visited));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const cached = visited.get(value);
  if (typeof cached !== 'undefined') {
    return cached;
  }

  const normalizedRecord: Record<string, unknown> = {};
  visited.set(value, normalizedRecord);

  Object.keys(value)
    .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
    .forEach((key) => {
      normalizedRecord[key] = normalizeUpdateConflictValue(
        (value as Record<string, unknown>)[key],
        visited,
      );
    });

  return normalizedRecord;
}

export function extractChangeLogReference(
  payload: ChangeLogPayload | object,
): string | number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const handle = (payload as Record<string, unknown>).handle;
  return typeof handle === 'string' || typeof handle === 'number'
    ? handle
    : null;
}

export function asChangeLogRecord(
  payload: ChangeLogPayload,
): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  return payload;
}

export function normalizeChangeLogPayload(
  payload: Record<string, unknown> | null | undefined,
): ChangeLogPayload {
  if (!payload) {
    return null;
  }

  const normalized = normalizeChangeLogValue(payload);
  return normalized &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized)
    ? (normalized as Record<string, unknown>)
    : null;
}

export function projectChangeLogPayload(
  template: EntityTemplateDto[],
  payload: ChangeLogPayload,
  shapeSource?: ChangeLogPayload,
): ChangeLogPayload {
  if (!payload) {
    return null;
  }

  const templateFieldMap = new Map(
    template.map((field) => [field.name, field]),
  );
  const sourceRecord = asChangeLogRecord(payload);
  const shapeRecord = asChangeLogRecord(shapeSource ?? null);
  const keys =
    shapeSource == null ? Object.keys(sourceRecord) : Object.keys(shapeRecord);
  const projected: Record<string, unknown> = {};

  keys.forEach((key) => {
    const field = templateFieldMap.get(key);
    const sourceValue = sourceRecord[key];

    if (field?.options?.includes('isSecurity')) {
      projected[key] =
        shapeSource == null
          ? (sourceValue ?? null)
          : Object.prototype.hasOwnProperty.call(shapeRecord, key)
            ? shapeRecord[key]
            : null;
      return;
    }

    projected[key] = projectChangeLogFieldValue(field, sourceValue);
  });

  return projected;
}

export function projectChangeLogFieldValue(
  field: EntityTemplateDto | undefined,
  value: unknown,
): unknown {
  if (value == null || !field?.isReference) {
    return value ?? null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => projectChangeLogReferenceValue(field, entry));
  }

  return projectChangeLogReferenceValue(field, value);
}

export function projectChangeLogReferenceValue(
  field: EntityTemplateDto,
  value: unknown,
): unknown {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  if (field.referencedPks.length <= 1) {
    const pk = field.referencedPks[0] ?? 'handle';
    return normalizeChangeLogValue((value as Record<string, unknown>)[pk]);
  }

  return Object.fromEntries(
    field.referencedPks.map((pk) => [
      pk,
      normalizeChangeLogValue((value as Record<string, unknown>)[pk]),
    ]),
  );
}

export function normalizeChangeLogValue(
  value: unknown,
  visited = new WeakMap<object, unknown>(),
): unknown {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeChangeLogValue(entry, visited));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const cached = visited.get(value);
  if (typeof cached !== 'undefined') {
    return cached;
  }

  const normalizedRecord: Record<string, unknown> = {};
  visited.set(value, normalizedRecord);

  Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .forEach((key) => {
      normalizedRecord[key] = normalizeChangeLogValue(
        (value as Record<string, unknown>)[key],
        visited,
      );
    });

  return normalizedRecord;
}
