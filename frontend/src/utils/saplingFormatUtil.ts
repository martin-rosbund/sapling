const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;

export type DateDisplayState = 'default' | 'past' | 'upcoming';

function isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime());
}

function parseLocalDateString(value: string): Date | null {
    const match = LOCAL_DATE_PATTERN.exec(value.trim());
    if (!match) {
        return null;
    }

    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseLocalDateTimeString(value: string): Date | null {
    const match = LOCAL_DATE_TIME_PATTERN.exec(value.trim());
    if (!match) {
        return null;
    }

    const [, year, month, day, hours, minutes, seconds, milliseconds] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds ?? '0'),
        Number(milliseconds?.padEnd(3, '0') ?? '0'),
    );
}

function hasTimeComponent(value: string | Date | null | undefined): boolean {
    if (!value) {
        return false;
    }

    if (value instanceof Date) {
        return isValidDate(value);
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return false;
    }

    return LOCAL_TIME_PATTERN.test(trimmedValue)
        || LOCAL_DATE_TIME_PATTERN.test(trimmedValue)
        || /(?:T|\s)\d{2}:\d{2}/.test(trimmedValue);
}

function parseDateValue(value: string | Date): Date | null {
    if (value instanceof Date) {
        return isValidDate(value) ? value : null;
    }

    const localDate = parseLocalDateString(value);
    if (localDate) {
        return localDate;
    }

    const localDateTime = parseLocalDateTimeString(value);
    if (localDateTime) {
        return localDateTime;
    }

    const parsedDate = new Date(value);
    return isValidDate(parsedDate) ? parsedDate : null;
}

function formatLocalizedDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatLocalizedTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeTimeString(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const match = LOCAL_TIME_PATTERN.exec(value.trim());
    if (!match) {
        return value;
    }

    const [, hours, minutes] = match;
    return `${hours}:${minutes}`;
}

function applyTimeToDate(baseDate: Date, timeValue?: string | Date | null): Date {
    const output = new Date(baseDate);
    if (!timeValue) {
        output.setHours(0, 0, 0, 0);
        return output;
    }

    if (timeValue instanceof Date && isValidDate(timeValue)) {
        output.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds(), 0);
        return output;
    }

    if (typeof timeValue === 'string') {
        const match = LOCAL_TIME_PATTERN.exec(timeValue.trim());
        if (match) {
            const [, hours, minutes, seconds] = match;
            output.setHours(Number(hours), Number(minutes), Number(seconds ?? '0'), 0);
            return output;
        }
    }

    return output;
}

function parseDateTimeValue(
    value: string | Date | null | undefined,
    dateValue?: string | Date | null,
    timeValue?: string | Date | null,
): Date | null {
    if (value) {
        return parseDateValue(value);
    }

    if (dateValue) {
        const parsedDate = parseDateValue(dateValue);
        if (parsedDate) {
            return applyTimeToDate(parsedDate, timeValue);
        }
    }

    return null;
}

export function getDateCellState(value: string | Date | null | undefined): DateDisplayState {
    const parsedDate = value ? parseDateValue(value) : null;
    if (!parsedDate) {
        return 'default';
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    const dateEnd = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59, 999);

    if (dateEnd < todayStart) {
        return 'past';
    }

    if (dateEnd <= tomorrowEnd) {
        return 'upcoming';
    }

    return 'default';
}

export function getDateTimeCellState(
    value: string | Date | null | undefined,
    dateValue?: string | Date | null,
    timeValue?: string | Date | null,
): DateDisplayState {
    const parsedDate = parseDateTimeValue(value, dateValue, timeValue);
    if (!parsedDate) {
        return 'default';
    }

    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (parsedDate < now) {
        return 'past';
    }

    if (parsedDate <= nextDay) {
        return 'upcoming';
    }

    return 'default';
}

function extractDateString(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    const parsedDate = value instanceof Date ? value : parseDateValue(value);
    if (isValidDate(parsedDate)) {
        return formatLocalizedDate(parsedDate);
    }

    return value;
}

function extractTimeString(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    if (value instanceof Date) {
        return formatLocalizedTime(value);
    }

    const normalizedTime = normalizeTimeString(value);
    if (normalizedTime !== value) {
        return normalizedTime;
    }

    if (!hasTimeComponent(value)) {
        return '';
    }

    const parsedDate = parseDateValue(value);
    if (isValidDate(parsedDate)) {
        return formatLocalizedTime(parsedDate);
    }

    return value;
}

export function formatDateValue(value: string | Date | null | undefined): string {
    return extractDateString(value);
}

export function formatTimeValue(value: string | Date | null | undefined): string {
    return extractTimeString(value);
}

export function formatDateTimeValue(
    value: string | Date | null | undefined,
    dateValue?: string | Date | null,
    timeValue?: string | Date | null,
): string {
    const parsedDateTime = parseDateTimeValue(value, dateValue, timeValue);
    if (!parsedDateTime) {
        return '';
    }

    const formattedDate = formatLocalizedDate(parsedDateTime);
    const formattedTime = value
        ? extractTimeString(value)
        : extractTimeString(timeValue ?? null);

    if (formattedDate && formattedTime) {
        return `${formattedDate} ${formattedTime}`;
    }

    return formattedDate || formattedTime;
}

// Helper functions for formatting values and dates in table components
export function formatValue(value: string, type?: string): string {
    switch (type?.toLocaleLowerCase()) {
    case 'datetime':
        return formatDateTimeValue(value);
    case 'datetype':
    case 'date':
        return formatDateValue(value);
    case 'time':
        return formatTimeValue(value);
    default:
        return value;
    }
}

// Helper function for formatting dates
export function formatDate(value: string | Date | null | undefined, type?: string): string {
    if (!value) {
        return '';
    }

    switch (type?.toLocaleLowerCase()) {
    case 'datetime':
        return formatDateTimeValue(value);
    case 'time':
        return formatTimeValue(value);
    default:
        return formatDateValue(value);
    }
}

// Helper function for formatting date ranges
export function formatDateFromTo(start: string | Date | null | undefined, end: string | Date | null | undefined) {
    if (!start) {
        return '';
    }

    const startDate = parseDateValue(start);
    const endDate = end ? parseDateValue(end) : null;

    if (!startDate) {
        return String(start);
    }

    const formattedStartDate = formatDateValue(start);
    const formattedStartTime = formatTimeValue(start);

    if (!endDate) {
        return `${formattedStartDate} ${formattedStartTime}`.trim();
    }

    const formattedEndDate = formatDateValue(end);
    const formattedEndTime = formatTimeValue(end);
    const sameDay = formattedStartDate === formattedEndDate;

    if (sameDay) {
        return `${formattedStartDate} ${formattedStartTime} - ${formattedEndTime}`.trim();
    }

    return `${formattedStartDate} ${formattedStartTime} - ${formattedEndDate} ${formattedEndTime}`.trim();
}