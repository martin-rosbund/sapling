import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { CustomFieldDefinitionItem } from '../../entity/CustomFieldDefinitionItem';
import { CustomFieldValueItem } from '../../entity/CustomFieldValueItem';
import { EntityItem } from '../../entity/EntityItem';
import {
  CustomFieldTypeItem,
  type CustomFieldType,
} from '../../entity/CustomFieldTypeItem';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import type { SaplingFormRenderer } from '../form-config/form-config.types';

export const CUSTOM_FIELD_PAYLOAD_KEY = 'customFields';
export const CUSTOM_FIELD_TEMPLATE_PREFIX = `${CUSTOM_FIELD_PAYLOAD_KEY}.`;

type CustomFieldPayload = Record<string, unknown>;
type SplitPayload<T extends Record<string, unknown>> = {
  data: T;
  customFields: CustomFieldPayload;
};

@Injectable()
export class GenericCustomFieldService {
  constructor(private readonly em: EntityManager) {}

  async getActiveDefinitions(
    entityHandle: string,
  ): Promise<CustomFieldDefinitionItem[]> {
    return this.em.find(
      CustomFieldDefinitionItem,
      { entity: { handle: entityHandle }, isActive: true },
      {
        orderBy: { fieldOrder: 'ASC', fieldKey: 'ASC' },
        populate: ['fieldType'],
      },
    );
  }

  async appendCustomFieldTemplates(
    entityHandle: string,
    templates: EntityTemplateDto[],
  ): Promise<EntityTemplateDto[]> {
    const definitions = await this.getActiveDefinitions(entityHandle);
    if (definitions.length === 0) {
      return templates;
    }

    return [
      ...templates,
      ...definitions.map((definition) =>
        this.createTemplateFromDefinition(definition),
      ),
    ];
  }

  splitPayload<T extends Record<string, unknown>>(payload: T): SplitPayload<T> {
    const data = { ...payload } as T;
    const customFields = this.normalizePayloadRecord(
      data[CUSTOM_FIELD_PAYLOAD_KEY],
    );

    delete data[CUSTOM_FIELD_PAYLOAD_KEY];

    for (const key of Object.keys(data)) {
      if (!key.startsWith(CUSTOM_FIELD_TEMPLATE_PREFIX)) {
        continue;
      }

      const fieldKey = key.slice(CUSTOM_FIELD_TEMPLATE_PREFIX.length);
      if (fieldKey) {
        customFields[fieldKey] = data[key];
      }
      delete data[key];
    }

    return { data, customFields };
  }

  collectCustomFieldsFromFlatPayload(
    payload: Record<string, unknown>,
  ): CustomFieldPayload {
    const customFields = this.normalizePayloadRecord(
      payload[CUSTOM_FIELD_PAYLOAD_KEY],
    );

    for (const key of Object.keys(payload)) {
      if (!key.startsWith(CUSTOM_FIELD_TEMPLATE_PREFIX)) {
        continue;
      }

      const fieldKey = key.slice(CUSTOM_FIELD_TEMPLATE_PREFIX.length);
      if (fieldKey) {
        customFields[fieldKey] = payload[key];
      }
      delete payload[key];
    }

    if (Object.keys(customFields).length > 0) {
      payload[CUSTOM_FIELD_PAYLOAD_KEY] = customFields;
    }

    return customFields;
  }

  async assertRequiredFields(
    entityHandle: string,
    customFields: CustomFieldPayload,
  ): Promise<void> {
    const definitions = await this.getActiveDefinitions(entityHandle);
    const missing = definitions.find(
      (definition) =>
        definition.isRequired &&
        !this.hasCustomFieldValue(
          this.normalizeValue(definition, customFields[definition.fieldKey]),
        ),
    );

    if (missing) {
      throw new BadRequestException(
        'import.requiredFieldMissing',
        `${CUSTOM_FIELD_TEMPLATE_PREFIX}${missing.fieldKey}`,
      );
    }
  }

  async upsertCustomFieldValues(
    entityHandle: string,
    recordReference: string | number | null,
    customFields: CustomFieldPayload,
  ): Promise<void> {
    if (
      recordReference == null ||
      Object.keys(customFields).length === 0
    ) {
      return;
    }

    const reference = String(recordReference);
    const definitions = await this.getActiveDefinitions(entityHandle);
    const definitionsByKey = new Map(
      definitions.map((definition) => [definition.fieldKey, definition]),
    );

    for (const [fieldKey, rawValue] of Object.entries(customFields)) {
      const definition = definitionsByKey.get(fieldKey);
      if (!definition) {
        throw new BadRequestException(
          'exception.badRequest',
          `Unknown custom field "${fieldKey}"`,
        );
      }

      const normalized = this.normalizeValue(definition, rawValue);
      let value = await this.em.findOne(CustomFieldValueItem, {
        entity: { handle: entityHandle },
        definition: { handle: definition.handle },
        recordReference: reference,
      });

      if (!this.hasCustomFieldValue(normalized)) {
        if (value) {
          this.em.remove(value);
        }
        continue;
      }

      if (!value) {
        value = new CustomFieldValueItem();
        value.entity = { handle: entityHandle } as EntityItem;
        value.definition = definition;
        value.recordReference = reference;
        this.em.persist(value);
      }

      this.assignValue(
        value,
        this.getDefinitionFieldType(definition),
        normalized,
      );
    }

    await this.em.flush();
  }

  async hydrateRecords<T>(
    entityHandle: string,
    input: T,
  ): Promise<T> {
    const records = Array.isArray(input) ? input : [input];
    const plainRecords = records.filter(
      (record): record is Record<string, unknown> =>
        !!record && typeof record === 'object' && !Array.isArray(record),
    );

    if (plainRecords.length === 0) {
      return input;
    }

    const references = plainRecords
      .map((record) => record.handle)
      .filter(
        (handle): handle is string | number =>
          typeof handle === 'string' || typeof handle === 'number',
      )
      .map((handle) => String(handle));

    if (references.length === 0) {
      return input;
    }

    const values = await this.em.find(
      CustomFieldValueItem,
      {
        entity: { handle: entityHandle },
        recordReference: { $in: references },
      },
      { populate: ['definition'] },
    );
    const valuesByReference = new Map<string, Record<string, unknown>>();

    for (const value of values) {
      const definition = value.definition as CustomFieldDefinitionItem;
      const fieldValue = this.extractValue(
        value,
        this.getDefinitionFieldType(definition),
      );
      const fields = valuesByReference.get(value.recordReference) ?? {};
      fields[definition.fieldKey] = fieldValue;
      valuesByReference.set(value.recordReference, fields);
    }

    plainRecords.forEach((record) => {
      const reference = String(record.handle ?? '');
      const customFields = valuesByReference.get(reference) ?? {};
      record[CUSTOM_FIELD_PAYLOAD_KEY] = customFields;

      for (const [fieldKey, value] of Object.entries(customFields)) {
        record[`${CUSTOM_FIELD_TEMPLATE_PREFIX}${fieldKey}`] = value;
      }
    });

    return input;
  }

  async applyCustomFieldFilters(
    entityHandle: string,
    criteria: object,
  ): Promise<object> {
    if (!this.isPlainRecord(criteria)) {
      return criteria;
    }

    return this.resolveCriteria(entityHandle, criteria);
  }

  private async resolveCriteria(
    entityHandle: string,
    criteria: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(criteria)) {
      if ((key === '$and' || key === '$or') && Array.isArray(value)) {
        next[key] = await Promise.all(
          value.map((entry) =>
            this.isPlainRecord(entry)
              ? this.resolveCriteria(entityHandle, entry)
              : entry,
          ),
        );
        continue;
      }

      if (key === CUSTOM_FIELD_PAYLOAD_KEY && this.isPlainRecord(value)) {
        const handleFilter = await this.buildCustomFieldHandleFilter(
          entityHandle,
          value,
        );
        this.mergeHandleFilter(next, handleFilter);
        continue;
      }

      if (key.startsWith(CUSTOM_FIELD_TEMPLATE_PREFIX)) {
        const fieldKey = key.slice(CUSTOM_FIELD_TEMPLATE_PREFIX.length);
        const handleFilter = await this.buildCustomFieldHandleFilter(
          entityHandle,
          { [fieldKey]: value },
        );
        this.mergeHandleFilter(next, handleFilter);
        continue;
      }

      next[key] = value;
    }

    return next;
  }

  private async buildCustomFieldHandleFilter(
    entityHandle: string,
    criteria: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const definitions = await this.getActiveDefinitions(entityHandle);
    const definitionsByKey = new Map(
      definitions.map((definition) => [definition.fieldKey, definition]),
    );
    let matchingReferences: Set<string> | null = null;

    for (const [fieldKey, condition] of Object.entries(criteria)) {
      const definition = definitionsByKey.get(fieldKey);
      if (!definition) {
        throw new BadRequestException(
          'exception.badRequest',
          `Unknown custom field "${fieldKey}"`,
        );
      }

      const values = await this.em.find(CustomFieldValueItem, {
        entity: { handle: entityHandle },
        definition: { handle: definition.handle },
        ...this.buildValueCriteria(definition, condition),
      });
      const references = new Set(values.map((value) => value.recordReference));
      matchingReferences =
        matchingReferences == null
          ? references
          : new Set(
              [...matchingReferences].filter((reference: string) =>
                references.has(reference),
              ),
            );
    }

    return { handle: { $in: [...(matchingReferences ?? new Set<string>())] } };
  }

  private buildValueCriteria(
    definition: CustomFieldDefinitionItem,
    condition: unknown,
  ): Record<string, unknown> {
    const column = this.getValueColumn(this.getDefinitionFieldType(definition));
    if (this.isPlainRecord(condition)) {
      return { [column]: this.normalizeOperatorCriteria(definition, condition) };
    }

    return { [column]: this.normalizeValue(definition, condition) };
  }

  private normalizeOperatorCriteria(
    definition: CustomFieldDefinitionItem,
    condition: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(condition).map(([operator, value]) => [
        operator,
        Array.isArray(value)
          ? value.map((entry) => this.normalizeValue(definition, entry))
          : this.normalizeValue(definition, value),
      ]),
    );
  }

  private mergeHandleFilter(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    if (!target.handle) {
      target.handle = source.handle;
      return;
    }

    target.$and = [
      ...(Array.isArray(target.$and) ? target.$and : []),
      { handle: target.handle },
      source,
    ];
    delete target.handle;
  }

  private createTemplateFromDefinition(
    definition: CustomFieldDefinitionItem,
  ): EntityTemplateDto {
    const template = new EntityTemplateDto();
    const fieldType = this.getDefinitionFieldType(definition);
    const type = this.getTemplateType(fieldType);

    template.name = `${CUSTOM_FIELD_TEMPLATE_PREFIX}${definition.fieldKey}`;
    template.type = type;
    template.length = fieldType === 'text' ? 255 : null;
    template.default = null;
    template.isPrimaryKey = false;
    template.isAutoIncrement = false;
    template.kind = null;
    template.mappedBy = null;
    template.inversedBy = null;
    template.isUnique = false;
    template.referenceName = '';
    template.isReference = false;
    template.isRequired = definition.isRequired;
    template.nullable = !definition.isRequired;
    template.isPersistent = true;
    template.referencedPks = [];
    template.options = fieldType === 'longText' ? ['isMarkdown'] : [];
    template.formGroup = 'Custom fields';
    template.formGroupOrder = 900;
    template.formOrder = definition.fieldOrder;
    template.formWidth = fieldType === 'longText' ? 4 : 2;
    template.formVisible = definition.formVisible;
    template.tableOrder = definition.fieldOrder;
    template.tableVisible = definition.tableVisible;
    template.mobileOrder = definition.fieldOrder;
    template.mobileVisible = definition.mobileVisible;
    template.formConfig = {
      label: definition.label,
      required: definition.isRequired,
      renderer: this.getRenderer(fieldType),
      metadata: {
        customField: {
          key: definition.fieldKey,
          type: fieldType,
          options: definition.selectOptions ?? [],
        },
      } as never,
    };

    (template as EntityTemplateDto & { customField?: object }).customField = {
      key: definition.fieldKey,
      type: fieldType,
      options: definition.selectOptions ?? [],
    };

    return template;
  }

  private getTemplateType(fieldType: CustomFieldType): string {
    switch (fieldType) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'DateType';
      case 'dateTime':
        return 'datetime';
      case 'multiSelect':
        return 'JsonType';
      case 'longText':
      case 'select':
      case 'text':
      default:
        return 'string';
    }
  }

  private getRenderer(fieldType: CustomFieldType): SaplingFormRenderer | null {
    switch (fieldType) {
      case 'longText':
        return 'longText';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'date';
      case 'dateTime':
        return 'dateTime';
      case 'select':
        return 'select';
      case 'multiSelect':
        return 'multiSelect';
      case 'text':
      default:
        return 'shortText';
    }
  }

  private normalizePayloadRecord(value: unknown): CustomFieldPayload {
    return this.isPlainRecord(value) ? { ...value } : {};
  }

  private normalizeValue(
    definition: CustomFieldDefinitionItem,
    value: unknown,
  ): unknown {
    if (value == null || value === '') {
      return null;
    }

    switch (this.getDefinitionFieldType(definition)) {
      case 'number': {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : null;
      }
      case 'boolean':
        return this.normalizeBoolean(value);
      case 'date':
      case 'dateTime':
        return this.normalizeDate(value);
      case 'multiSelect':
        return this.normalizeMultiSelect(definition, value);
      case 'select':
        return this.normalizeSelect(definition, value);
      case 'longText':
      case 'text':
      default:
        return String(value).trim();
    }
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'ja'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off', 'nein'].includes(normalized)) {
      return false;
    }

    return null;
  }

  private normalizeDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeSelect(
    definition: CustomFieldDefinitionItem,
    value: unknown,
  ): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return null;
    }

    const allowed = this.getAllowedSelectValues(definition);
    return allowed.size === 0 || allowed.has(normalized) ? normalized : null;
  }

  private normalizeMultiSelect(
    definition: CustomFieldDefinitionItem,
    value: unknown,
  ): string[] {
    const values = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',').map((entry) => entry.trim())
        : [];
    const allowed = this.getAllowedSelectValues(definition);

    return values
      .map((entry) => String(entry ?? '').trim())
      .filter((entry) => entry && (allowed.size === 0 || allowed.has(entry)));
  }

  private getAllowedSelectValues(
    definition: CustomFieldDefinitionItem,
  ): Set<string> {
    return new Set(
      (definition.selectOptions ?? [])
        .map((option) => option.value?.trim())
        .filter((value): value is string => Boolean(value)),
    );
  }

  private assignValue(
    item: CustomFieldValueItem,
    fieldType: CustomFieldType,
    value: unknown,
  ): void {
    item.valueString = null;
    item.valueNumber = null;
    item.valueBoolean = null;
    item.valueDate = null;
    item.valueDateTime = null;
    item.valueJson = null;

    switch (fieldType) {
      case 'number':
        item.valueNumber = value as number;
        break;
      case 'boolean':
        item.valueBoolean = value as boolean;
        break;
      case 'date':
        item.valueDate = value as Date;
        break;
      case 'dateTime':
        item.valueDateTime = value as Date;
        break;
      case 'multiSelect':
        item.valueJson = value;
        break;
      case 'select':
      case 'longText':
      case 'text':
      default:
        item.valueString = String(value);
        break;
    }
  }

  private extractValue(
    item: CustomFieldValueItem,
    fieldType: CustomFieldType,
  ): unknown {
    switch (fieldType) {
      case 'number':
        return item.valueNumber ?? null;
      case 'boolean':
        return item.valueBoolean ?? null;
      case 'date':
        return item.valueDate ?? null;
      case 'dateTime':
        return item.valueDateTime ?? null;
      case 'multiSelect':
        return item.valueJson ?? [];
      case 'select':
      case 'longText':
      case 'text':
      default:
        return item.valueString ?? null;
    }
  }

  private getValueColumn(fieldType: CustomFieldType): keyof CustomFieldValueItem {
    switch (fieldType) {
      case 'number':
        return 'valueNumber';
      case 'boolean':
        return 'valueBoolean';
      case 'date':
        return 'valueDate';
      case 'dateTime':
        return 'valueDateTime';
      case 'multiSelect':
        return 'valueJson';
      case 'select':
      case 'longText':
      case 'text':
      default:
        return 'valueString';
    }
  }

  private getDefinitionFieldType(
    definition: CustomFieldDefinitionItem,
  ): CustomFieldType {
    const value = definition.fieldType as unknown;
    const handle =
      typeof value === 'string'
        ? value
        : this.isPlainRecord(value)
          ? String((value as Partial<CustomFieldTypeItem>).handle ?? '')
          : '';

    if (this.isCustomFieldType(handle)) {
      return handle;
    }

    throw new BadRequestException(
      'exception.badRequest',
      `Invalid custom field type "${handle}"`,
    );
  }

  private isCustomFieldType(value: string): value is CustomFieldType {
    return [
      'text',
      'longText',
      'number',
      'boolean',
      'date',
      'dateTime',
      'select',
      'multiSelect',
    ].includes(value);
  }

  private hasCustomFieldValue(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && typeof value !== 'undefined' && value !== '';
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    try {
      const object = wrap(value as object).toObject();
      return !!object && typeof object === 'object' && !Array.isArray(object);
    } catch {
      return true;
    }
  }
}
