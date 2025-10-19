/**
 * Common validation rules for forms.
 */

/**
 * Required field validation rule.
 * @param label - The label of the field
 * @returns A validation function
 */
export const requiredRule = (label: string) => (v: any) =>
  v !== null && v !== undefined && v !== '' ? true : `${label} is required`;