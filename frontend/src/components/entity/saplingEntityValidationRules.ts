
// #region Common Validation Rules for Forms

/**
 * Validation rule for required fields.
 * Returns true if the value is not null, undefined, or empty; otherwise returns an error message.
 * @param label The label of the field.
 * @returns A validation function that checks if the value is present.
 */
export const requiredRule = (label: string) => (v: unknown) =>
  v !== null && v !== undefined && v !== '' ? true : `${label} is required`;

// #endregion