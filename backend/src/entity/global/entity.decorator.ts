import 'reflect-metadata';

const SAPLING_OPTIONS_METADATA_KEY = 'sapling:options';
const SAPLING_REFERENCE_DEPENDENCY_METADATA_KEY = 'sapling:referenceDependency';
const SAPLING_FORM_LAYOUT_METADATA_KEY = 'sapling:formLayout';

/**
 * @file entity.decorator.ts
 * @version     1.0
 * @author      Martin Rosbund
 * @summary     Provides custom decorators and utility functions for Sapling entity metadata.
 *
 * @description This module defines the Sapling decorator for annotating entity properties with custom metadata options.
 *              It also provides utility functions to retrieve and check these options at runtime.
 *
 * @see         https://mikro-orm.io/docs/metadata for ORM metadata usage
 */

/**
 * Enumeration of all Sapling metadata options.
 *
 * @typedef {('isCompany'|'isPerson'|'isEntity'|'isSecurity'|'isShowInCompact'|'isHideAsReference'|'isColor'|'isIcon'|'isChip'|'isReadOnly'|'isLink'|'isMail'|'isPhone'|'isOrderASC'|'isOrderDESC'|'isNavigation'|'isMarkdown'|'isSystem'|'isPercent'|'isMoney'|'isDuplicateCheck')} SaplingOption
 *
 * @property isCompany           Marks property as company-related
 * @property isPerson            Marks property as person-related
 * @property isEntity            Marks property as entity-related
 * @property isSecurity          Marks property as security-related
 * @property isShowInCompact     Show property in compact views
 * @property isHideAsReference   Hide property when referenced
 * @property isColor             Property represents a color value
 * @property isIcon              Property represents an icon
 * @property isChip              Property is displayed as a chip
 * @property isReadOnly          Property is read-only
 * @property isLink              Property is a hyperlink
 * @property isMail              Property is an email address
 * @property isPhone             Property is a phone number
 * @property isOrderASC          Property is used for ascending order
 * @property isOrderDESC         Property is used for descending order
 * @property isNavigation        Property is used for navigation
 * @property isMarkdown          Property contains markdown content
 * @property isSystem            Property is a system field
 * @property isPercent           Property is a percentage value
 * @property isMoney             Property is a monetary value
 * @property isDuplicateCheck    Property is used for duplicate checking
 * @property isPartner           Property is used for partner filter
 * @property isToday             Property is used for today's date filter
 * @property isDeadline          Property is used for deadline filter
 * @property isCurrentPerson       Property is used for current user filter
 * @property isAutoKey           Property uses an auto-generated key editor in dialogs
 */
export type SaplingOption =
  | 'isCompany'
  | 'isPerson'
  | 'isEntity'
  | 'isSecurity'
  | 'isShowInCompact'
  | 'isHideAsReference'
  | 'isColor'
  | 'isIcon'
  | 'isChip'
  | 'isReadOnly'
  | 'isLink'
  | 'isMail'
  | 'isPhone'
  | 'isOrderASC'
  | 'isOrderDESC'
  | 'isNavigation'
  | 'isMarkdown'
  | 'isSystem'
  | 'isPercent'
  | 'isMoney'
  | 'isDuplicateCheck'
  | 'isPartner'
  | 'isToday'
  | 'isDeadline'
  | 'isCurrentPerson'
  | 'isCurrentCompany'
  | 'isAutoKey'
  | 'isDateStart'
  | 'isDateEnd';

export interface SaplingReferenceDependency {
  parentField: string;
  targetField: string;
  requireParent?: boolean;
  clearOnParentChange?: boolean;
}

export type SaplingFormWidthSpan = 1 | 2 | 3 | 4;

export interface SaplingFormLayoutMetadata {
  group: string | null;
  order: number | null;
  width: SaplingFormWidthSpan | null;
}

export interface SaplingFormOptions {
  group?: string | null;
  order?: number | null;
  width?: SaplingFormWidthSpan | null;
}

const DEFAULT_SAPLING_FORM_LAYOUT: SaplingFormLayoutMetadata = {
  group: null,
  order: null,
  width: null,
};

function normalizeSaplingFormGroup(group: string): string | null {
  const normalizedGroup = group.trim();
  return normalizedGroup.length > 0 ? normalizedGroup : null;
}

function normalizeSaplingFormOrder(order: number): number | null {
  return Number.isFinite(order) ? Math.trunc(order) : null;
}

function normalizeSaplingFormWidth(width: number): SaplingFormWidthSpan | null {
  if (!Number.isFinite(width)) {
    return null;
  }

  const normalizedWidth = Math.max(1, Math.min(4, Math.trunc(width)));
  return normalizedWidth as SaplingFormWidthSpan;
}

function getStoredSaplingFormLayout(
  target: object,
  propertyKey: string | symbol,
): Partial<SaplingFormLayoutMetadata> {
  return (Reflect.getMetadata(
    SAPLING_FORM_LAYOUT_METADATA_KEY,
    target,
    propertyKey,
  ) ?? {}) as Partial<SaplingFormLayoutMetadata>;
}

function defineSaplingFormLayout(
  target: object,
  propertyKey: string | symbol,
  patch: Partial<SaplingFormLayoutMetadata>,
) {
  Reflect.defineMetadata(
    SAPLING_FORM_LAYOUT_METADATA_KEY,
    {
      ...getSaplingFormLayout(target, propertyKey),
      ...patch,
    },
    target,
    propertyKey,
  );
}

/**
 * Sapling decorator for annotating entity properties with custom metadata options.
 *
 * @param {SaplingOption[]} options - Array of Sapling options to apply to the property.
 * @returns {PropertyDecorator}     - Property decorator function.
 *
 * @example
 *   @Sapling(['isCompany', 'isShowInCompact'])
 *   companyName: string;
 */
export function Sapling(options: SaplingOption[]) {
  return function (target: object, propertyKey: string | symbol) {
    Reflect.defineMetadata(
      SAPLING_OPTIONS_METADATA_KEY,
      options,
      target,
      propertyKey,
    );
  };
}

export function SaplingDependsOn(dependency: SaplingReferenceDependency) {
  return function (target: object, propertyKey: string | symbol) {
    Reflect.defineMetadata(
      SAPLING_REFERENCE_DEPENDENCY_METADATA_KEY,
      dependency,
      target,
      propertyKey,
    );
  };
}

export function SaplingForm(options: SaplingFormOptions) {
  return function (target: object, propertyKey: string | symbol) {
    defineSaplingFormLayout(target, propertyKey, {
      ...(Object.prototype.hasOwnProperty.call(options, 'group')
        ? {
            group:
              typeof options.group === 'string'
                ? normalizeSaplingFormGroup(options.group)
                : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, 'order')
        ? {
            order:
              typeof options.order === 'number'
                ? normalizeSaplingFormOrder(options.order)
                : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, 'width')
        ? {
            width:
              typeof options.width === 'number'
                ? normalizeSaplingFormWidth(options.width)
                : null,
          }
        : {}),
    });
  };
}

/**
 * Checks if a specific Sapling option is present on a property.
 *
 * @param {object} target         - The target object (entity instance or prototype).
 * @param {string} propertyKey    - The property name to check.
 * @param {SaplingOption} option  - The Sapling option to check for.
 * @returns {boolean}             - True if the option is present, false otherwise.
 */
export function hasSaplingOption(
  target: object,
  propertyKey: string,
  option: SaplingOption,
): boolean {
  const options = getSaplingOptions(target, propertyKey);
  return options.includes(option);
}

/**
 * Retrieves all Sapling options applied to a property.
 *
 * @param {object} target         - The target object (entity instance or prototype).
 * @param {string} propertyKey    - The property name to retrieve options for.
 * @returns {SaplingOption[]}     - Array of Sapling options applied to the property.
 */
export function getSaplingOptions(
  target: object,
  propertyKey: string,
): SaplingOption[] {
  return (Reflect.getMetadata(
    SAPLING_OPTIONS_METADATA_KEY,
    target,
    propertyKey,
  ) || []) as SaplingOption[];
}

export function getSaplingReferenceDependency(
  target: object,
  propertyKey: string,
): SaplingReferenceDependency | null {
  return (Reflect.getMetadata(
    SAPLING_REFERENCE_DEPENDENCY_METADATA_KEY,
    target,
    propertyKey,
  ) ?? null) as SaplingReferenceDependency | null;
}

export function getSaplingFormLayout(
  target: object,
  propertyKey: string | symbol,
): SaplingFormLayoutMetadata {
  const layout = getStoredSaplingFormLayout(target, propertyKey);

  return {
    group:
      typeof layout.group === 'string'
        ? normalizeSaplingFormGroup(layout.group)
        : DEFAULT_SAPLING_FORM_LAYOUT.group,
    order:
      typeof layout.order === 'number'
        ? normalizeSaplingFormOrder(layout.order)
        : DEFAULT_SAPLING_FORM_LAYOUT.order,
    width:
      typeof layout.width === 'number'
        ? normalizeSaplingFormWidth(layout.width)
        : DEFAULT_SAPLING_FORM_LAYOUT.width,
  };
}
