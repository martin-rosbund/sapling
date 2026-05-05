import type { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import type { AiClientTimeContext } from './ai.types';
import { asRecord } from './ai-navigation.utils';

export function extractClientTimeContext(dto: {
  clientCurrentDateTime?: string;
  clientTimeZone?: string;
  clientLocale?: string;
  clientUtcOffsetMinutes?: number;
}): AiClientTimeContext | undefined {
  const currentDate = parseClientCurrentDate(dto.clientCurrentDateTime);
  const timeZone = isValidTimeZone(dto.clientTimeZone)
    ? dto.clientTimeZone.trim()
    : undefined;
  const locale =
    typeof dto.clientLocale === 'string' && dto.clientLocale.trim()
      ? dto.clientLocale.trim()
      : undefined;
  const utcOffsetMinutes = Number.isFinite(dto.clientUtcOffsetMinutes)
    ? Math.trunc(dto.clientUtcOffsetMinutes ?? 0)
    : undefined;

  if (
    !currentDate &&
    !timeZone &&
    !locale &&
    typeof utcOffsetMinutes === 'undefined'
  ) {
    return undefined;
  }

  return {
    currentDate,
    timeZone,
    locale,
    utcOffsetMinutes,
  };
}

export function extractClientTimeContextFromHistory(
  history: AiChatMessageItem[],
): AiClientTimeContext | undefined {
  for (const message of [...history].reverse()) {
    if (message.role !== 'user') {
      continue;
    }

    const payload = asRecord(message.requestPayload);

    if (!payload) {
      continue;
    }

    const currentDate = parseClientCurrentDate(payload.clientCurrentDateTime);
    const timeZone = isValidTimeZone(payload.clientTimeZone)
      ? payload.clientTimeZone.trim()
      : undefined;
    const locale =
      typeof payload.clientLocale === 'string' && payload.clientLocale.trim()
        ? payload.clientLocale.trim()
        : undefined;
    const utcOffsetMinutes =
      typeof payload.clientUtcOffsetMinutes === 'number' &&
      Number.isFinite(payload.clientUtcOffsetMinutes)
        ? Math.trunc(payload.clientUtcOffsetMinutes)
        : undefined;

    if (
      currentDate ||
      timeZone ||
      locale ||
      typeof utcOffsetMinutes !== 'undefined'
    ) {
      return {
        currentDate,
        timeZone,
        locale,
        utcOffsetMinutes,
      };
    }
  }

  return undefined;
}

function parseClientCurrentDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() });
    return true;
  } catch {
    return false;
  }
}
