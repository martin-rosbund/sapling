export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceWeekdayCode =
  | 'MO'
  | 'TU'
  | 'WE'
  | 'TH'
  | 'FR'
  | 'SA'
  | 'SU';

export interface ParsedRecurrenceRule {
  raw: string;
  frequency: RecurrenceFrequency;
  interval: number;
  byDay: RecurrenceWeekdayCode[];
  count?: number;
  until?: Date;
}

const RECURRENCE_FREQUENCIES = new Set<RecurrenceFrequency>([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

const RECURRENCE_WEEKDAY_CODES = new Set<RecurrenceWeekdayCode>([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
]);

const GRAPH_WEEKDAY_BY_CODE: Record<RecurrenceWeekdayCode, string> = {
  MO: 'monday',
  TU: 'tuesday',
  WE: 'wednesday',
  TH: 'thursday',
  FR: 'friday',
  SA: 'saturday',
  SU: 'sunday',
};

export function parseRecurrenceRule(
  recurrenceRule?: string | null,
): ParsedRecurrenceRule | null {
  if (typeof recurrenceRule !== 'string') {
    return null;
  }

  const trimmedRule = recurrenceRule.trim();
  if (!trimmedRule) {
    return null;
  }

  const normalizedRule = trimmedRule.startsWith('RRULE:')
    ? trimmedRule.slice('RRULE:'.length).trim()
    : trimmedRule;
  const parts = normalizedRule.split(';').map((part) => part.trim());
  const values = new Map<string, string>();

  for (const part of parts) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim().toUpperCase();
    const value = part.slice(separatorIndex + 1).trim();
    if (key && value) {
      values.set(key, value);
    }
  }

  const frequencyValue = values.get('FREQ')?.toUpperCase() as
    | RecurrenceFrequency
    | undefined;
  if (!frequencyValue || !RECURRENCE_FREQUENCIES.has(frequencyValue)) {
    return null;
  }

  const intervalValue = Number.parseInt(values.get('INTERVAL') ?? '1', 10);
  const interval =
    Number.isFinite(intervalValue) && intervalValue > 0 ? intervalValue : 1;

  const countValue = values.get('COUNT');
  const count = countValue ? Number.parseInt(countValue, 10) : undefined;

  const until = parseCompactUtcDate(values.get('UNTIL'));
  const byDay = parseByDay(values.get('BYDAY'));

  return {
    raw: normalizeRecurrenceRule(normalizedRule),
    frequency: frequencyValue,
    interval,
    byDay,
    ...(typeof count === 'number' && Number.isFinite(count) && count > 0
      ? { count }
      : {}),
    ...(until ? { until } : {}),
  };
}

export function buildGoogleRecurrence(
  recurrenceRule?: string | null,
): string[] | [] {
  const parsedRule = parseRecurrenceRule(recurrenceRule);
  return parsedRule ? [`RRULE:${parsedRule.raw}`] : [];
}

export function buildAzureRecurrence(
  startDate: Date,
  recurrenceRule?: string | null,
): Record<string, unknown> | null {
  const parsedRule = parseRecurrenceRule(recurrenceRule);
  if (!parsedRule) {
    return null;
  }

  const pattern = buildAzurePattern(startDate, parsedRule);
  if (!pattern) {
    return null;
  }

  return {
    pattern,
    range: buildAzureRange(startDate, parsedRule),
  };
}

function buildAzurePattern(
  startDate: Date,
  parsedRule: ParsedRecurrenceRule,
): Record<string, unknown> | null {
  switch (parsedRule.frequency) {
    case 'DAILY':
      return {
        type: 'daily',
        interval: parsedRule.interval,
      };
    case 'WEEKLY':
      return {
        type: 'weekly',
        interval: parsedRule.interval,
        daysOfWeek: (parsedRule.byDay.length > 0
          ? parsedRule.byDay
          : [toWeekdayCode(startDate)]
        ).map((weekday) => GRAPH_WEEKDAY_BY_CODE[weekday]),
        firstDayOfWeek: 'monday',
      };
    case 'MONTHLY':
      return {
        type: 'absoluteMonthly',
        interval: parsedRule.interval,
        dayOfMonth: startDate.getUTCDate(),
      };
    case 'YEARLY':
      return {
        type: 'absoluteYearly',
        interval: parsedRule.interval,
        dayOfMonth: startDate.getUTCDate(),
        month: startDate.getUTCMonth() + 1,
      };
    default:
      return null;
  }
}

function buildAzureRange(
  startDate: Date,
  parsedRule: ParsedRecurrenceRule,
): Record<string, unknown> {
  const baseRange = {
    startDate: formatUtcDateOnly(startDate),
    recurrenceTimeZone: 'UTC',
  };

  if (typeof parsedRule.count === 'number' && parsedRule.count > 0) {
    return {
      type: 'numbered',
      ...baseRange,
      numberOfOccurrences: parsedRule.count,
    };
  }

  if (parsedRule.until) {
    return {
      type: 'endDate',
      ...baseRange,
      endDate: formatUtcDateOnly(parsedRule.until),
    };
  }

  return {
    type: 'noEnd',
    ...baseRange,
  };
}

function parseByDay(value?: string): RecurrenceWeekdayCode[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim().toUpperCase() as RecurrenceWeekdayCode)
    .filter(
      (item, index, items) =>
        RECURRENCE_WEEKDAY_CODES.has(item) && items.indexOf(item) === index,
    );
}

function parseCompactUtcDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toUpperCase();
  const fullMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
    normalizedValue,
  );

  if (fullMatch) {
    const [, year, month, day, hours, minutes, seconds] = fullMatch;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
      ),
    );
  }

  const dateMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(normalizedValue);
  if (!dateMatch) {
    return undefined;
  }

  const [, year, month, day] = dateMatch;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0),
  );
}

function normalizeRecurrenceRule(rule: string): string {
  return rule
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(';');
}

function formatUtcDateOnly(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function toWeekdayCode(date: Date): RecurrenceWeekdayCode {
  const weekdayIndex = date.getUTCDay();

  switch (weekdayIndex) {
    case 0:
      return 'SU';
    case 1:
      return 'MO';
    case 2:
      return 'TU';
    case 3:
      return 'WE';
    case 4:
      return 'TH';
    case 5:
      return 'FR';
    case 6:
      return 'SA';
    default:
      return 'MO';
  }
}
