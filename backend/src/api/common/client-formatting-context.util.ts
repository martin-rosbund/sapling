import type { Request } from 'express';

export type ClientFormattingContext = {
  clientLocale?: string;
  clientTimeZone?: string;
};

export function extractClientFormattingContextFromRequest(
  req: Request,
): ClientFormattingContext {
  const clientLocale =
    normalizeLocale(readHeader(req, 'x-sapling-client-locale')) ??
    normalizeLocale(readHeader(req, 'accept-language')?.split(',')[0]);
  const clientTimeZone = normalizeTimeZone(
    readHeader(req, 'x-sapling-client-time-zone'),
  );

  return {
    ...(clientLocale ? { clientLocale } : {}),
    ...(clientTimeZone ? { clientTimeZone } : {}),
  };
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' ? value : undefined;
}

function normalizeLocale(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeTimeZone(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized });
    return normalized;
  } catch {
    return undefined;
  }
}
