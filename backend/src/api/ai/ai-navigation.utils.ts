import { AiChatNavigationLink, AiExecutedToolCall } from './ai.types';

export function buildNavigationLinks(
  toolCalls: AiExecutedToolCall[],
): AiChatNavigationLink[] {
  const deduplicatedLinks = new Map<string, AiChatNavigationLink>();

  for (const toolCall of toolCalls) {
    for (const link of buildNavigationLinksForToolCall(toolCall)) {
      const existingLink = deduplicatedLinks.get(link.path);
      deduplicatedLinks.set(link.path, {
        ...existingLink,
        ...link,
        isPrimary:
          existingLink?.isPrimary ??
          (deduplicatedLinks.size === 0 && link.isPrimary !== false),
      });
    }
  }

  return [...deduplicatedLinks.values()];
}

export function alignAssistantContentWithNavigationLinks(
  content: string,
  navigationLinks: AiChatNavigationLink[],
  pageUrl?: string | null,
): string {
  if (!content.trim() || navigationLinks.length !== 1) {
    return content;
  }

  const navigationUrl = buildAbsoluteNavigationUrl(
    navigationLinks[0].path,
    pageUrl,
  );

  if (!navigationUrl) {
    return content;
  }

  let normalizedContent = content.replace(
    /\]\(((?:https?:\/\/|\/)[^)]+)\)/g,
    (match, rawUrl: string) =>
      isLikelySaplingNavigationReference(rawUrl, pageUrl)
        ? `](${navigationUrl})`
        : match,
  );

  normalizedContent = normalizedContent.replace(
    /https?:\/\/[^\s)]+/g,
    (rawUrl) =>
      isLikelySaplingNavigationReference(rawUrl, pageUrl)
        ? navigationUrl
        : rawUrl,
  );

  return normalizedContent;
}

export function buildNavigationLink(
  toolCall: AiExecutedToolCall,
): AiChatNavigationLink | null {
  return buildNavigationLinksForToolCall(toolCall)[0] ?? null;
}

export function buildNavigationLinksForToolCall(
  toolCall: AiExecutedToolCall,
): AiChatNavigationLink[] {
  const entityHandle = asNonEmptyString(toolCall.arguments.entityHandle);
  const rawResult = asRecord(toolCall.rawResult);

  if (!isNavigableToolCall(toolCall, rawResult)) {
    return [];
  }

  if (toolCall.toolName === 'ticket_search') {
    const resultHandles = extractDataRecordHandles(rawResult);

    return buildRecordHandleListLink('ticket', resultHandles, {
      intent: 'searchResults',
      label: buildListLabel('ticket', resultHandles),
      toolName: toolCall.toolName,
    });
  }

  if (toolCall.toolName === 'semantic_search') {
    const semanticEntityHandle =
      asNonEmptyString(toolCall.arguments.entityHandle) ??
      asNonEmptyString(rawResult?.entityHandle) ??
      'ticket';
    const resultHandles = extractResultRecordHandles(rawResult?.results);

    return buildRecordHandleListLink(semanticEntityHandle, resultHandles, {
      intent: 'searchResults',
      label: buildListLabel(semanticEntityHandle, resultHandles),
      toolName: toolCall.toolName,
    });
  }

  if (toolCall.toolName === 'knowledge_search') {
    const resultItems = Array.isArray(rawResult?.results)
      ? rawResult.results
      : [];
    const handlesByEntity = new Map<string, Array<string | number>>();

    for (const item of resultItems) {
      const itemRecord = asRecord(item);
      const itemEntityHandle = asNonEmptyString(itemRecord?.entityHandle);
      const itemHandle = asHandleValue(itemRecord?.handle);

      if (!itemEntityHandle || itemHandle == null) {
        continue;
      }

      const handles = handlesByEntity.get(itemEntityHandle) ?? [];
      handles.push(itemHandle);
      handlesByEntity.set(itemEntityHandle, handles);
    }

    return [...handlesByEntity.entries()].flatMap(
      ([resultEntityHandle, resultHandles]) =>
        buildRecordHandleListLink(resultEntityHandle, resultHandles, {
          intent: 'searchResults',
          label: buildListLabel(resultEntityHandle, resultHandles),
          toolName: toolCall.toolName,
        }),
    );
  }

  if (!entityHandle) {
    return [];
  }

  if (rawResult?.found === false) {
    return [];
  }

  if (rawResult?.queryExecuted === false) {
    return [];
  }

  if (entityHandle === 'entityRoute') {
    const directRoutePath = extractEntityRoutePath(
      toolCall.rawResult,
      toolCall.arguments,
    );

    if (directRoutePath) {
      return [
        {
          path: directRoutePath,
          entityHandle,
          kind: 'route',
          intent: 'route',
          label: 'Seite öffnen',
          resultCount: 1,
          toolName: toolCall.toolName,
        },
      ];
    }
  }

  if (toolCall.toolName === 'generic_list') {
    const resultHandles = extractDataRecordHandles(rawResult);

    return buildRecordHandleListLink(entityHandle, resultHandles, {
      intent: 'searchResults',
      label: buildListLabel(entityHandle, resultHandles),
      toolName: toolCall.toolName,
    });
  }

  if (
    toolCall.toolName === 'generic_get' ||
    toolCall.toolName === 'generic_timeline' ||
    toolCall.toolName === 'generic_create' ||
    toolCall.toolName === 'generic_update'
  ) {
    const recordHandle = extractRecordHandle(
      toolCall.rawResult,
      toolCall.arguments.handle,
    );

    if (recordHandle == null) {
      return [];
    }

    return [
      {
        path: buildEntityTablePath(entityHandle, { handle: recordHandle }),
        entityHandle,
        kind: 'record',
        intent:
          toolCall.toolName === 'generic_create' ||
          toolCall.toolName === 'generic_update'
            ? 'mutationResult'
            : 'record',
        label: 'Datensatz öffnen',
        resultCount: 1,
        recordHandles: [recordHandle],
        toolName: toolCall.toolName,
      },
    ];
  }

  return [];
}

export function buildEntityTablePath(
  entityHandle: string,
  filter?: Record<string, unknown>,
): string {
  const hasFilter = !!filter && Object.keys(filter).length > 0;
  const query = hasFilter
    ? `?filter=${encodeURIComponent(JSON.stringify(filter))}`
    : '';

  return `/table/${entityHandle}${query}`;
}

export function buildAbsoluteNavigationUrl(
  path: string,
  pageUrl?: string | null,
): string | null {
  if (!path.trim()) {
    return null;
  }

  if (!pageUrl?.trim()) {
    return path;
  }

  try {
    return new URL(path, pageUrl).toString();
  } catch {
    return path;
  }
}

export function isLikelySaplingNavigationReference(
  rawUrl: string,
  pageUrl?: string | null,
): boolean {
  try {
    const currentUrl = pageUrl?.trim() ? new URL(pageUrl) : null;
    const url = rawUrl.startsWith('/')
      ? new URL(rawUrl, currentUrl ?? 'http://localhost')
      : new URL(rawUrl);
    const sameOrigin = currentUrl ? url.origin === currentUrl.origin : false;
    const knownSaplingHost = ['localhost', '127.0.0.1', 'sapling.ai'].includes(
      url.hostname.toLowerCase(),
    );
    const pathLooksInternal =
      url.pathname.startsWith('/table/') ||
      url.pathname.startsWith('/partner/') ||
      url.pathname.startsWith('/dashboard/') ||
      url.pathname.startsWith('/system/') ||
      /\/ticket(\/|$)/.test(url.pathname);

    return pathLooksInternal && (sameOrigin || knownSaplingHost);
  } catch {
    return false;
  }
}

export function extractEntityRoutePath(
  rawResult: unknown,
  args: Record<string, unknown>,
): string | null {
  const resultRecord = asRecord(rawResult);
  const directRoute = normalizeRoutePath(resultRecord?.route);

  if (directRoute) {
    return directRoute;
  }

  const recordRoute = normalizeRoutePath(asRecord(resultRecord?.record)?.route);

  if (recordRoute) {
    return recordRoute;
  }

  const resultData = Array.isArray(resultRecord?.data) ? resultRecord.data : [];

  for (const item of resultData) {
    const routePath = normalizeRoutePath(asRecord(item)?.route);

    if (routePath) {
      return routePath;
    }
  }

  const routeFilter = asRecord(args.filter);
  return normalizeRoutePath(routeFilter?.route);
}

export function normalizeRoutePath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`;
}

export function extractRecordHandle(
  rawResult: unknown,
  fallbackHandle?: unknown,
): string | number | null {
  const resultRecord = asRecord(rawResult);
  const resultHandle =
    asHandleValue(resultRecord?.handle) ??
    asHandleValue(asRecord(resultRecord?.record)?.handle);

  return resultHandle ?? asHandleValue(fallbackHandle);
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asHandleValue(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isNavigableToolCall(
  toolCall: AiExecutedToolCall,
  rawResult: Record<string, unknown> | undefined,
): boolean {
  if (
    toolCall.status === 'blocked' ||
    toolCall.status === 'repair' ||
    toolCall.status === 'error'
  ) {
    return false;
  }

  if (
    rawResult?.ok === false ||
    rawResult?.pendingToolAction === true ||
    rawResult?.queryExecuted === false ||
    rawResult?.status === 'pending'
  ) {
    return false;
  }

  return true;
}

function buildRecordHandleListLink(
  entityHandle: string,
  rawHandles: Array<string | number>,
  options: {
    intent: AiChatNavigationLink['intent'];
    label: string;
    toolName: string;
  },
): AiChatNavigationLink[] {
  const recordHandles = deduplicateHandles(rawHandles);

  if (recordHandles.length === 0) {
    return [];
  }

  return [
    {
      path: buildEntityTablePath(entityHandle, {
        handle:
          recordHandles.length === 1
            ? recordHandles[0]
            : {
                $in: recordHandles,
              },
      }),
      entityHandle,
      kind: recordHandles.length === 1 ? 'record' : 'list',
      intent: options.intent,
      label: options.label,
      resultCount: recordHandles.length,
      recordHandles,
      toolName: options.toolName,
    },
  ];
}

function extractDataRecordHandles(
  record: Record<string, unknown> | undefined,
): Array<string | number> {
  return extractResultRecordHandles(record?.data);
}

function extractResultRecordHandles(value: unknown): Array<string | number> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);
      return (
        asHandleValue(record?.handle) ??
        asHandleValue(asRecord(record?.record)?.handle)
      );
    })
    .filter((handle): handle is string | number => handle != null);
}

function deduplicateHandles(
  handles: Array<string | number>,
): Array<string | number> {
  const deduplicated = new Map<string, string | number>();

  for (const handle of handles) {
    deduplicated.set(String(handle), handle);
  }

  return [...deduplicated.values()];
}

function buildListLabel(entityHandle: string, handles: Array<string | number>) {
  const count = deduplicateHandles(handles).length;

  if (count === 1) {
    return 'Datensatz öffnen';
  }

  return `${count} Datensätze öffnen`;
}
