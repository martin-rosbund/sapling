import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';

export type JsonRecord = Record<string, unknown>;
export type SupportedMailProvider = 'azure' | 'google';

export type MailAttachment = {
  handle: number;
  filename: string;
  mimetype: string;
  filePath: string;
};

export type SendResult = {
  responseStatusCode?: number;
  responseBody?: object;
  responseHeaders?: object;
  providerMessageId?: string;
};

export type ProviderErrorShape = {
  statusCode?: number;
  body?: unknown;
  headers?: unknown;
  message?: string;
};

const MAIL_EVENT_TITLE_MAX_LENGTH = 128;
const MAIL_EVENT_TITLE_TRUNCATE_AT = 125;
const MAIL_EVENT_DESCRIPTION_MAX_LENGTH = 1024;
const MAIL_EVENT_DESCRIPTION_TRUNCATE_AT = 1021;

function truncateWithEllipsis(
  value: string,
  maxLength: number,
  truncateAt: number,
): string {
  return value.length > maxLength ? `${value.slice(0, truncateAt)}...` : value;
}

export function buildMailEventTitle(delivery: EmailDeliveryItem): string {
  const recipientList = (delivery.toRecipients ?? []).join(', ');
  const baseTitle = recipientList ? `E-Mail an ${recipientList}` : 'E-Mail';
  return truncateWithEllipsis(
    baseTitle,
    MAIL_EVENT_TITLE_MAX_LENGTH,
    MAIL_EVENT_TITLE_TRUNCATE_AT,
  );
}

export function buildMailEventDescription(delivery: EmailDeliveryItem): string {
  const subjectLine = delivery.subject
    ? `Betreff: ${delivery.subject}\n\n`
    : '';
  const body = delivery.bodyMarkdown ?? '';
  return truncateWithEllipsis(
    `${subjectLine}${body}`,
    MAIL_EVENT_DESCRIPTION_MAX_LENGTH,
    MAIL_EVENT_DESCRIPTION_TRUNCATE_AT,
  );
}

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

export function toPersistedObject(value: unknown): object | undefined {
  return isRecord(value) ? value : undefined;
}

function extractStatusCode(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function getMailProviderErrorShape(error: unknown): ProviderErrorShape {
  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : undefined;

    return {
      statusCode:
        extractStatusCode(error.statusCode) ??
        extractStatusCode(response?.status),
      body: error.body ?? response?.data,
      headers: error.headers ?? response?.headers,
      message: typeof error.message === 'string' ? error.message : undefined,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}

function extractProviderErrorCode(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const directCode =
    typeof body.code === 'string' ? body.code.trim() : undefined;
  if (directCode) {
    return directCode;
  }

  if (isRecord(body.error) && typeof body.error.code === 'string') {
    const nestedCode = body.error.code.trim();
    if (nestedCode.length > 0) {
      return nestedCode;
    }
  }

  if (typeof body.error === 'string') {
    const errorCode = body.error.trim();
    return errorCode.length > 0 ? errorCode : undefined;
  }

  return undefined;
}

export function isAuthenticationProviderError(error: unknown): boolean {
  const providerError = getMailProviderErrorShape(error);
  if (providerError.statusCode === 401 || providerError.statusCode === 403) {
    return true;
  }

  const errorCode = extractProviderErrorCode(providerError.body)?.toLowerCase();
  return Boolean(
    errorCode &&
    (errorCode.includes('token') ||
      errorCode.includes('auth') ||
      errorCode.includes('unauthorized') ||
      errorCode.includes('forbidden') ||
      errorCode.includes('invalid_grant')),
  );
}

export function normalizeEmailAddress(
  value: string | null | undefined,
): string | undefined {
  const rawValue = value?.trim();
  if (!rawValue) {
    return undefined;
  }

  const angleBracketMatch = rawValue.match(/<([^<>]+)>/);
  const bracketNormalized = angleBracketMatch?.[1]?.trim() ?? rawValue;

  if (/^[a-z][a-z0-9+.-]*:/i.test(bracketNormalized)) {
    if (!/^smtp:/i.test(bracketNormalized)) {
      return undefined;
    }
  }

  const normalized = bracketNormalized.replace(/^smtp:/i, '').trim();
  if (
    !normalized ||
    /\s/.test(normalized) ||
    !/^[^@\s<>]+@[^@\s<>]+$/.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

export function normalizeDisplayName(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
