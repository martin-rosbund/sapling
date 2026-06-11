import type { SaplingFormConfigPayload } from '../../entity/SaplingFormConfigItem';

export const SAPLING_FORM_CONFIG_SCHEMA = 'sapling.form-config.v1' as const;

export type SaplingFormRenderer =
  | 'auto'
  | 'shortText'
  | 'longText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'dateTime'
  | 'time'
  | 'markdown'
  | 'json'
  | 'phone'
  | 'mail'
  | 'link'
  | 'password'
  | 'money'
  | 'percent'
  | 'color'
  | 'icon'
  | 'select'
  | 'multiSelect';

export type SaplingFormFieldWidth = 1 | 2 | 3 | 4;

export interface SaplingFormFieldConfig {
  visible?: boolean;
  group?: string | null;
  groupOrder?: number | null;
  order?: number | null;
  width?: SaplingFormFieldWidth | null;
  tableVisible?: boolean;
  tableOrder?: number | null;
  mobileVisible?: boolean;
  mobileOrder?: number | null;
  label?: string | null;
  helpText?: string | null;
  placeholder?: string | null;
  required?: boolean | null;
  readonly?: boolean | null;
  renderer?: SaplingFormRenderer | null;
  defaultValue?: unknown;
  validation?: unknown[];
  condition?: Record<string, unknown> | null;
  referenceFilter?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export type NormalizedSaplingFormConfig = SaplingFormConfigPayload & {
  fields: Record<string, SaplingFormFieldConfig>;
};
