import 'reflect-metadata';

const SAPLING_OPTIONS_METADATA_KEY = 'sapling:options';
const SAPLING_REFERENCE_DEPENDENCY_METADATA_KEY = 'sapling:referenceDependency';
const SAPLING_FORM_LAYOUT_METADATA_KEY = 'sapling:formLayout';
const SAPLING_GENERIC_REFERENCE_METADATA_KEY = 'sapling:genericReference';
const SAPLING_REFERENCE_TEMPLATE_METADATA_KEY = 'sapling:referenceTemplate';

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
 * @typedef {('isCompany'|'isPerson'|'isEntity'|'isSecurity'|'isValue'|'isHideAsReference'|'isColor'|'isIcon'|'isChip'|'isReadOnly'|'isLink'|'isMail'|'isPhone'|'isOrderASC'|'isOrderDESC'|'isNavigation'|'isMarkdown'|'isSystem'|'isPercent'|'isMoney'|'isNumeric'|'isDuplicateCheck')} SaplingOption
 *
 * @property isCompany           Marks property as company-related
 * @property isPerson            Marks property as person-related
 * @property isEntity            Marks property as entity-related
 * @property isSecurity          Marks property as security-related
 * @property isValue             Marks property as the primary human-readable value for the entity
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
 * @property isNumeric           Property is a plain numeric value with step controls
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
  | 'isValue'
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
  | 'isNumeric'
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
  groupOrder: number | null;
  order: number | null;
  width: SaplingFormWidthSpan | null;
  formVisible: boolean | null;
  tableOrder: number | null;
  tableVisible: boolean | null;
  mobileOrder: number | null;
  mobileVisible: boolean | null;
}

export interface SaplingFormOptions {
  group?: string | null;
  groupOrder?: number | null;
  order?: number | null;
  width?: SaplingFormWidthSpan | null;
  visible?: boolean | null;
  formVisible?: boolean | null;
  tableOrder?: number | null;
  tableVisible?: boolean | null;
  mobileOrder?: number | null;
  mobileVisible?: boolean | null;
}

export interface SaplingGenericReferenceMetadata {
  entityField: string;
  handleField: string;
}

export interface SaplingReferenceTemplateMapping {
  sourceField: string;
  targetField: string;
  overwrite?: boolean;
}

export interface SaplingReferenceTemplateMetadata {
  mappings: SaplingReferenceTemplateMapping[];
}

const DEFAULT_SAPLING_FORM_LAYOUT: SaplingFormLayoutMetadata = {
  group: null,
  groupOrder: null,
  order: null,
  width: null,
  formVisible: null,
  tableOrder: null,
  tableVisible: null,
  mobileOrder: null,
  mobileVisible: null,
};

function normalizeSaplingFormGroup(group: string): string | null {
  const normalizedGroup = group.trim();
  return normalizedGroup.length > 0 ? normalizedGroup : null;
}

function normalizeSaplingFormOrder(order: number): number | null {
  return Number.isFinite(order) ? Math.trunc(order) : null;
}

function normalizeSaplingFormGroupOrder(order: number): number | null {
  return Number.isFinite(order) ? Math.trunc(order) : null;
}

function normalizeSaplingFormLayoutOrder(order: number): number | null {
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
 *   @Sapling(['isCompany', 'isValue'])
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
      ...(Object.prototype.hasOwnProperty.call(options, 'groupOrder')
        ? {
            groupOrder:
              typeof options.groupOrder === 'number'
                ? normalizeSaplingFormGroupOrder(options.groupOrder)
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
      ...(Object.prototype.hasOwnProperty.call(options, 'formVisible') ||
      Object.prototype.hasOwnProperty.call(options, 'visible')
        ? {
            formVisible:
              typeof (options.formVisible ?? options.visible) === 'boolean'
                ? (options.formVisible ?? options.visible)
                : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, 'tableOrder')
        ? {
            tableOrder:
              typeof options.tableOrder === 'number'
                ? normalizeSaplingFormLayoutOrder(options.tableOrder)
                : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, 'tableVisible')
        ? {
            tableVisible:
              typeof options.tableVisible === 'boolean'
                ? options.tableVisible
                : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, 'mobileOrder')
        ? {
            mobileOrder:
              typeof options.mobileOrder === 'number'
                ? normalizeSaplingFormLayoutOrder(options.mobileOrder)
                : null,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, 'mobileVisible')
        ? {
            mobileVisible:
              typeof options.mobileVisible === 'boolean'
                ? options.mobileVisible
                : null,
          }
        : {}),
    });
  };
}

export function SaplingGenericReference(
  metadata: SaplingGenericReferenceMetadata,
) {
  return function (target: object, propertyKey: string | symbol) {
    Reflect.defineMetadata(
      SAPLING_GENERIC_REFERENCE_METADATA_KEY,
      {
        entityField: metadata.entityField.trim(),
        handleField: metadata.handleField.trim(),
      } satisfies SaplingGenericReferenceMetadata,
      target,
      propertyKey,
    );
  };
}

export function SaplingReferenceTemplate(
  metadata:
    | SaplingReferenceTemplateMapping
    | SaplingReferenceTemplateMapping[]
    | SaplingReferenceTemplateMetadata,
) {
  return function (target: object, propertyKey: string | symbol) {
    const mappings = Array.isArray(metadata)
      ? metadata
      : 'mappings' in metadata
        ? metadata.mappings
        : [metadata];

    Reflect.defineMetadata(
      SAPLING_REFERENCE_TEMPLATE_METADATA_KEY,
      {
        mappings: mappings
          .map((mapping) => ({
            sourceField: mapping.sourceField.trim(),
            targetField: mapping.targetField.trim(),
            overwrite: mapping.overwrite,
          }))
          .filter((mapping) => mapping.sourceField && mapping.targetField),
      } satisfies SaplingReferenceTemplateMetadata,
      target,
      propertyKey,
    );
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
    groupOrder:
      typeof layout.groupOrder === 'number'
        ? normalizeSaplingFormGroupOrder(layout.groupOrder)
        : DEFAULT_SAPLING_FORM_LAYOUT.groupOrder,
    order:
      typeof layout.order === 'number'
        ? normalizeSaplingFormOrder(layout.order)
        : DEFAULT_SAPLING_FORM_LAYOUT.order,
    width:
      typeof layout.width === 'number'
        ? normalizeSaplingFormWidth(layout.width)
        : DEFAULT_SAPLING_FORM_LAYOUT.width,
    formVisible:
      typeof layout.formVisible === 'boolean'
        ? layout.formVisible
        : DEFAULT_SAPLING_FORM_LAYOUT.formVisible,
    tableOrder:
      typeof layout.tableOrder === 'number'
        ? normalizeSaplingFormLayoutOrder(layout.tableOrder)
        : DEFAULT_SAPLING_FORM_LAYOUT.tableOrder,
    tableVisible:
      typeof layout.tableVisible === 'boolean'
        ? layout.tableVisible
        : DEFAULT_SAPLING_FORM_LAYOUT.tableVisible,
    mobileOrder:
      typeof layout.mobileOrder === 'number'
        ? normalizeSaplingFormLayoutOrder(layout.mobileOrder)
        : DEFAULT_SAPLING_FORM_LAYOUT.mobileOrder,
    mobileVisible:
      typeof layout.mobileVisible === 'boolean'
        ? layout.mobileVisible
        : DEFAULT_SAPLING_FORM_LAYOUT.mobileVisible,
  };
}

export function getSaplingGenericReference(
  target: object,
  propertyKey: string | symbol,
): SaplingGenericReferenceMetadata | null {
  const metadata = Reflect.getMetadata(
    SAPLING_GENERIC_REFERENCE_METADATA_KEY,
    target,
    propertyKey,
  ) as Partial<SaplingGenericReferenceMetadata> | null;

  if (!metadata) {
    return null;
  }

  const entityField =
    typeof metadata.entityField === 'string' ? metadata.entityField.trim() : '';
  const handleField =
    typeof metadata.handleField === 'string' ? metadata.handleField.trim() : '';

  if (!entityField || !handleField) {
    return null;
  }

  return {
    entityField,
    handleField,
  };
}

export function getSaplingReferenceTemplate(
  target: object,
  propertyKey: string | symbol,
): SaplingReferenceTemplateMetadata | null {
  const metadata = Reflect.getMetadata(
    SAPLING_REFERENCE_TEMPLATE_METADATA_KEY,
    target,
    propertyKey,
  ) as Partial<SaplingReferenceTemplateMetadata> | null;

  if (!metadata || !Array.isArray(metadata.mappings)) {
    return null;
  }

  const mappings = metadata.mappings
    .map((mapping) => ({
      sourceField:
        typeof mapping.sourceField === 'string'
          ? mapping.sourceField.trim()
          : '',
      targetField:
        typeof mapping.targetField === 'string'
          ? mapping.targetField.trim()
          : '',
      overwrite: mapping.overwrite,
    }))
    .filter((mapping) => mapping.sourceField && mapping.targetField);

  return mappings.length > 0 ? { mappings } : null;
}
