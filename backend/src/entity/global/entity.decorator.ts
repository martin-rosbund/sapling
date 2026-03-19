import 'reflect-metadata';

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
  | 'isDuplicateCheck';

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
    Reflect.defineMetadata('sapling:options', options, target, propertyKey);
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
  return (Reflect.getMetadata('sapling:options', target, propertyKey) ||
    []) as SaplingOption[];
}
