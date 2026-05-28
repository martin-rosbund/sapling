import { AiChatNavigationLink, AiExecutedToolCall } from './ai.types';

export function buildNavigationLinks(
  toolCalls: AiExecutedToolCall[],
): AiChatNavigationLink[] {
  const deduplicatedLinks = new Map<string, AiChatNavigationLink>();

  for (const toolCall of toolCalls) {
    const link = buildNavigationLink(toolCall);

    if (!link) {
      continue;
    }

    deduplicatedLinks.set(link.path, link);
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
  const entityHandle = asNonEmptyString(toolCall.arguments.entityHandle);
  const rawResult = asRecord(toolCall.rawResult);

  if (toolCall.toolName === 'ticket_search') {
    return {
      path: buildEntityTablePath('ticket', asRecord(rawResult?.appliedFilter)),
      entityHandle: 'ticket',
      kind: 'list',
    };
  }

  if (toolCall.toolName === 'semantic_search') {
    const semanticEntityHandle =
      asNonEmptyString(toolCall.arguments.entityHandle) ??
      asNonEmptyString(rawResult?.entityHandle) ??
      'ticket';
    const resultHandles = Array.isArray(rawResult?.results)
      ? rawResult.results
          .map((item) => asRecord(item)?.handle)
          .filter(
            (value): value is string | number =>
              typeof value === 'string' || typeof value === 'number',
          )
      : [];

    if (resultHandles.length === 0) {
      return null;
    }

    return {
      path: buildEntityTablePath(semanticEntityHandle, {
        handle: {
          $in: resultHandles,
        },
      }),
      entityHandle: semanticEntityHandle,
      kind: 'list',
    };
  }

  if (toolCall.toolName === 'knowledge_search') {
    const resultItems = Array.isArray(rawResult?.results)
      ? rawResult.results
      : [];
    const firstEntityHandle = resultItems
      .map((item) => asNonEmptyString(asRecord(item)?.entityHandle))
      .find((value): value is string => !!value);

    if (!firstEntityHandle) {
      return null;
    }

    const resultHandles = resultItems
      .filter(
        (item) =>
          asNonEmptyString(asRecord(item)?.entityHandle) === firstEntityHandle,
      )
      .map((item) => asRecord(item)?.handle)
      .filter(
        (value): value is string | number =>
          typeof value === 'string' || typeof value === 'number',
      );

    if (resultHandles.length === 0) {
      return null;
    }

    return {
      path: buildEntityTablePath(firstEntityHandle, {
        handle: {
          $in: resultHandles,
        },
      }),
      entityHandle: firstEntityHandle,
      kind: 'list',
    };
  }

  if (!entityHandle) {
    return null;
  }

  if (rawResult?.found === false) {
    return null;
  }

  if (entityHandle === 'entityRoute') {
    const directRoutePath = extractEntityRoutePath(
      toolCall.rawResult,
      toolCall.arguments,
    );

    if (directRoutePath) {
      return {
        path: directRoutePath,
        entityHandle,
        kind: 'route',
      };
    }
  }

  if (toolCall.toolName === 'generic_list') {
    return {
      path: buildEntityTablePath(
        entityHandle,
        asRecord(toolCall.arguments.filter),
      ),
      entityHandle,
      kind: 'list',
    };
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
      return null;
    }

    return {
      path: buildEntityTablePath(entityHandle, { handle: recordHandle }),
      entityHandle,
      kind: 'record',
    };
  }

  return null;
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
  const resultHandle = asHandleValue(
    rawResult && typeof rawResult === 'object'
      ? (rawResult as Record<string, unknown>).handle
      : null,
  );

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
