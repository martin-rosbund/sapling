import type { AiExecutedToolCall } from './ai.types';

export type AiTraceableToolExecution = {
  serverHandle: number;
  serverName: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  modelResult?: unknown;
  rawResult: unknown;
};

export function buildAiExecutedToolCallTrace(
  toolExecution: AiTraceableToolExecution,
  options: {
    arguments?: Record<string, unknown>;
    iteration?: number;
    startedAt?: number;
  } = {},
): AiExecutedToolCall {
  return {
    serverHandle: toolExecution.serverHandle,
    serverName: toolExecution.serverName,
    toolName: toolExecution.toolName,
    arguments: options.arguments ?? toolExecution.arguments ?? {},
    iteration: options.iteration,
    status: resolveAiToolCallStatus(toolExecution.rawResult),
    durationMs:
      options.startedAt == null
        ? undefined
        : Math.max(0, Date.now() - options.startedAt),
    resultCount: countAiToolResultItems(toolExecution.rawResult),
    sourceEntityHandles: extractAiToolEntityHandles(toolExecution.rawResult),
    repairHints: extractAiToolRepairHints(toolExecution.rawResult),
    modelResult: toolExecution.modelResult,
    rawResult: toolExecution.rawResult,
  };
}

export function toAiToolCallRunTrace(
  toolCall: AiExecutedToolCall,
): Record<string, unknown> {
  return {
    serverHandle: toolCall.serverHandle,
    serverName: toolCall.serverName,
    toolName: toolCall.toolName,
    arguments: toolCall.arguments,
    iteration: toolCall.iteration ?? null,
    status: toolCall.status ?? resolveAiToolCallStatus(toolCall.rawResult),
    durationMs: toolCall.durationMs ?? null,
    resultCount:
      toolCall.resultCount ?? countAiToolResultItems(toolCall.rawResult),
    sourceEntityHandles:
      toolCall.sourceEntityHandles ??
      extractAiToolEntityHandles(toolCall.rawResult),
    repairHints:
      toolCall.repairHints ?? extractAiToolRepairHints(toolCall.rawResult),
  };
}

export function resolveAiToolCallStatus(
  rawResult: unknown,
): AiExecutedToolCall['status'] {
  const record = asRecord(rawResult);

  if (
    record?.queryExecuted === false &&
    record.status === 'needs_schema_retry'
  ) {
    return 'repair';
  }

  if (record?.pendingToolAction === true || record?.status === 'pending') {
    return 'blocked';
  }

  if (record?.ok === false) {
    const errorText = String(record.error ?? record.message ?? '');
    return /permission|notallowed|not_allowed|readonly|readOnly|requiresConfirmation|requires_confirmation/i.test(
      errorText,
    )
      ? 'blocked'
      : 'error';
  }

  return 'success';
}

export function countAiToolResultItems(rawResult: unknown): number | null {
  if (Array.isArray(rawResult)) {
    return rawResult.length;
  }

  const record = asRecord(rawResult);

  if (!record) {
    return null;
  }

  for (const key of ['data', 'results', 'matches', 'rows', 'templates']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  if (record.queryExecuted === false) {
    return 0;
  }

  if (record.found === true) {
    return 1;
  }

  if (record.found === false) {
    return 0;
  }

  return null;
}

export function extractAiToolEntityHandles(rawResult: unknown): string[] {
  const handles = new Set<string>();
  collectEntityHandles(rawResult, handles, 0);
  return [...handles];
}

export function extractAiToolRepairHints(rawResult: unknown): string[] {
  const record = asRecord(rawResult);

  if (
    record?.queryExecuted !== false ||
    record.status !== 'needs_schema_retry'
  ) {
    return [];
  }

  const hints = Array.isArray(record.usageHints)
    ? record.usageHints.filter(
        (hint): hint is string => typeof hint === 'string',
      )
    : [];

  return hints.slice(0, 8);
}

function collectEntityHandles(
  value: unknown,
  handles: Set<string>,
  depth: number,
): void {
  if (depth > 4 || !value) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectEntityHandles(item, handles, depth + 1);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  for (const [key, childValue] of Object.entries(record)) {
    if (
      (key === 'entityHandle' || key.endsWith('EntityHandle')) &&
      typeof childValue === 'string' &&
      childValue.trim()
    ) {
      handles.add(childValue.trim());
    }

    if (key === 'entityHandles' && Array.isArray(childValue)) {
      for (const handle of childValue) {
        if (typeof handle === 'string' && handle.trim()) {
          handles.add(handle.trim());
        }
      }
    }

    if (typeof childValue === 'object') {
      collectEntityHandles(childValue, handles, depth + 1);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
