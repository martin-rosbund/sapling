export interface ErrorDiagnostics {
  name?: string;
  message?: string;
  stack?: string;
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  schema?: string;
  column?: string;
  severity?: string;
  length?: number;
  errno?: string | number;
  sqlState?: string;
  sqlMessage?: string;
}

export interface ForeignKeyViolationDiagnostics extends ErrorDiagnostics {
  referencingTable?: string;
  referencedColumn?: string;
  referencedValue?: string;
}

const ERROR_FIELD_NAMES = [
  'cause',
  'driverError',
  'originalError',
  'previous',
  'parent',
] as const;

const DIAGNOSTIC_FIELD_NAMES = [
  'code',
  'detail',
  'constraint',
  'table',
  'schema',
  'column',
  'severity',
  'length',
  'errno',
  'sqlState',
  'sqlMessage',
] as const;

export function buildErrorDiagnostics(error: unknown): ErrorDiagnostics {
  const chain = collectErrorChain(error);
  const diagnostics: ErrorDiagnostics = {};

  for (const item of chain) {
    if (item instanceof Error) {
      diagnostics.name ??= item.name;
      diagnostics.message ??= item.message;
      diagnostics.stack ??= item.stack;
    }

    if (!isRecord(item)) {
      continue;
    }

    for (const fieldName of DIAGNOSTIC_FIELD_NAMES) {
      const value = item[fieldName];
      if (
        diagnostics[fieldName] == null &&
        (typeof value === 'string' || typeof value === 'number')
      ) {
        diagnostics[fieldName] = value as never;
      }
    }
  }

  if (!diagnostics.message && typeof error === 'string') {
    diagnostics.message = error;
  }

  return diagnostics;
}

export function buildForeignKeyViolationDiagnostics(
  error: unknown,
): ForeignKeyViolationDiagnostics | null {
  const diagnostics = buildErrorDiagnostics(error);
  const isForeignKeyViolation =
    diagnostics.code === '23503' ||
    diagnostics.name === 'ForeignKeyConstraintViolationException';

  if (!isForeignKeyViolation) {
    return null;
  }

  const detail = diagnostics.detail ?? diagnostics.message ?? '';
  const tableMatch = /table "([^"]+)"/i.exec(detail);
  const keyMatch = /Key \(([^)]+)\)=\(([^)]+)\)/i.exec(detail);

  return {
    ...diagnostics,
    referencingTable: tableMatch?.[1],
    referencedColumn: keyMatch?.[1],
    referencedValue: keyMatch?.[2],
  };
}

export function stringifyErrorForLog(error: unknown): string {
  const diagnostics = buildErrorDiagnostics(error);
  return JSON.stringify(diagnostics, null, 2);
}

function collectErrorChain(error: unknown): unknown[] {
  const result: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current != null && !seen.has(current)) {
    seen.add(current);
    result.push(current);

    if (!isRecord(current)) {
      break;
    }

    const record = current;
    current = ERROR_FIELD_NAMES.map((fieldName) => record[fieldName]).find(
      (value) => value != null,
    );
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
