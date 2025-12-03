// Helper functions for formatting values and dates in table components
export function formatValue(value: string, type?: string): string {
    switch (type?.toLocaleLowerCase()) {
    case 'datetime':
    case 'datetype':
    case 'date':
        return formatDate(value, type);
    default:
        return value;
    }
}

// Helper function for formatting dates
export function formatDate(value: string | Date | null | undefined, type?: string): string {
    if (!value) return '';
    const date = new Date(value);
    switch (type?.toLocaleLowerCase()) {
    case 'datetime':
        return date.toLocaleString();
    default:
        return date.toLocaleDateString();
    }
}

// Helper function for formatting date ranges
export function formatDateFromTo(start: string | Date | null | undefined, end: string | Date | null | undefined) {
    if (!start) return '';
    const dateStart = new Date(start);
    const dateEnd = end ? new Date(end) : null;
    const sameDay = dateEnd && dateStart.toLocaleDateString() === dateEnd.toLocaleDateString();

    const timeRange = dateStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + (dateEnd ? dateEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

    if (!dateEnd || sameDay) {
        return formatDate(dateStart) + ' ' + timeRange;
    }

    return formatDate(dateStart) + ' ' + dateStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + formatDate(dateEnd) + ' ' + dateEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}