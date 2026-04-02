const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?/;
const ISO_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/;

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

function parseIsoDateTimeLocally(value: string): Date | null {
    const match = ISO_DATE_TIME_PATTERN.exec(value.trim());
    if (!match) {
        return null;
    }

    // Preserve stored calendar and clock values instead of letting the runtime reinterpret them as UTC.
    const [, year, month, day, hours, minutes, seconds] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds ?? '0'),
    );
}

function parseDateValue(value: string | Date): Date | null {
    if (value instanceof Date) {
        return isValidDate(value) ? value : null;
    }

    const localDate = parseLocalDateString(value);
    if (localDate) {
        return localDate;
    }

    const localDateTime = parseIsoDateTimeLocally(value);
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

function extractDateString(value: string | Date | null | undefined): string {
    if (!value) {
        return '';
    }

    if (value instanceof Date) {
        return formatLocalizedDate(value);
    }

    const localDate = parseLocalDateString(value);
    if (localDate) {
        return formatLocalizedDate(localDate);
    }

    const localDateTime = parseIsoDateTimeLocally(value);
    if (localDateTime) {
        return formatLocalizedDate(localDateTime);
    }

    const parsedDate = new Date(value);
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

    const localDateTime = parseIsoDateTimeLocally(value);
    if (localDateTime) {
        return formatLocalizedTime(localDateTime);
    }

    const parsedDate = new Date(value);
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
    const formattedDate = extractDateString(dateValue ?? value);
    const formattedTime = extractTimeString(timeValue ?? value);

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