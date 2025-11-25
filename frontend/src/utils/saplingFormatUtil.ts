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

export function formatDate(value: string | Date, type?: string): string {
    if (!value) return '';
    const date = new Date(value);
    switch (type?.toLocaleLowerCase()) {
    case 'datetime':
        return date.toLocaleString();
    default:
        return date.toLocaleDateString();
    }
}
