import type { SaplingTableHeaderItem } from '@/entity/structure';
import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';

export function useSaplingReference(
  object: Ref<Record<string, string | number | boolean>>,
  headers: Ref<SaplingTableHeaderItem[]>,
): { panelTitle: ComputedRef<string> } {

  const panelTitle = computed(() => {
    return headers.value.filter(x => x.isShowInCompact === true)
      .map(header => formatValue(String(object.value?.[header.key] ?? ''), header.type))
      .join(' | ');
  });

  // #region Utility Functions
  /**
   * Formats a value for display in entity tables based on its type (e.g., date, datetime, etc.).
   * @param value The value to format.
   * @param type The type of the value (e.g., 'date', 'datetime').
   * @returns The formatted value as a string.
   */
  function formatValue(value: string, type?: string): string {
      switch (type?.toLocaleLowerCase()) {
      case 'datetime':
      case 'datetype':
      case 'date':
          return formatDate(value, type);
      default:
          return value;
      }
  }

  /**
   * Formats a date value for display based on its type.
   * @param value The date value (string or Date).
   * @param type The type of the value (e.g., 'datetime', 'date').
   * @returns The formatted date as a string.
   */
  function formatDate(value: string | Date, type?: string): string {
      if (!value) return '';
      const date = new Date(value);
      switch (type?.toLocaleLowerCase()) {
      case 'datetime':
          return date.toLocaleString();
      default:
          return date.toLocaleDateString();
      }
  }
  // #endregion

  return { panelTitle };
}
