import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import {
  SaplingFormConfigItem,
  type SaplingFormConfigPayload,
  type SaplingFormConfigScope,
} from '../../entity/SaplingFormConfigItem';
import type { EntityTemplateDto } from '../template/dto/entity-template.dto';
import {
  SAPLING_FORM_CONFIG_SCHEMA,
  type NormalizedSaplingFormConfig,
  type SaplingFormFieldConfig,
  type SaplingFormFieldWidth,
  type SaplingFormRenderer,
} from './form-config.types';
import type {
  SaplingFormConfigValidationIssueDto,
  SaplingFormConfigValidationResultDto,
  SaveSaplingFormConfigDto,
} from './dto/form-config.dto';

const FIELD_RENDERERS = new Set<SaplingFormRenderer>([
  'auto',
  'shortText',
  'longText',
  'number',
  'boolean',
  'date',
  'dateTime',
  'time',
  'markdown',
  'json',
  'phone',
  'mail',
  'link',
  'password',
  'money',
  'percent',
  'color',
  'icon',
]);

const CONFIG_SCOPE_ORDER: Record<SaplingFormConfigScope, number> = {
  global: 0,
  role: 1,
  person: 2,
};

@Injectable()
export class FormConfigService {
  constructor(private readonly em: EntityManager) {}

  async listConfigs(entityHandle: string): Promise<SaplingFormConfigItem[]> {
    return this.em.find(
      SaplingFormConfigItem,
      { entity: { handle: entityHandle } },
      { orderBy: { scope: 'ASC', name: 'ASC', handle: 'ASC' } },
    );
  }

  async getConfig(
    entityHandle: string,
    handle: number,
  ): Promise<SaplingFormConfigItem> {
    const config = await this.em.findOne(
      SaplingFormConfigItem,
      {
        handle,
        entity: { handle: entityHandle },
      },
      { populate: ['entity', 'person'] },
    );

    if (!config) {
      throw new NotFoundException('global.notFound');
    }

    return config;
  }

  async saveConfig(
    entityHandle: string,
    payload: SaveSaplingFormConfigDto,
    templates: EntityTemplateDto[],
    existingHandle?: number,
  ): Promise<SaplingFormConfigItem> {
    const validation = this.validateConfig(entityHandle, payload.config, templates);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors);
    }

    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    if (!entity) {
      throw new NotFoundException('global.entityNotFound');
    }

    const normalizedScope = this.normalizeScope(payload.scope);
    const normalizedScopeHandle = this.normalizeOptionalString(payload.scopeHandle);
    const normalizedName = this.normalizeRequiredString(payload.name, 'name');

    let configItem =
      typeof existingHandle === 'number'
        ? await this.getConfig(entityHandle, existingHandle)
        : null;

    if (!configItem) {
      configItem = new SaplingFormConfigItem();
    }

    configItem.name = normalizedName;
    configItem.entity = entity;
    configItem.scope = normalizedScope;
    configItem.scopeHandle = normalizedScope === 'global' ? undefined : normalizedScopeHandle;
    configItem.isActive = payload.isActive !== false;
    configItem.isDefault = payload.isDefault === true;
    configItem.version = 1;
    configItem.config = validation.normalizedConfig;

    const personHandle =
      normalizedScope === 'person' && normalizedScopeHandle
        ? Number(normalizedScopeHandle)
        : null;
    configItem.person =
      personHandle != null && Number.isFinite(personHandle)
        ? ((await this.em.findOne(PersonItem, { handle: personHandle })) ??
            undefined)
        : undefined;

    this.em.persist(configItem);
    await this.em.flush();

    return configItem;
  }

  validateConfig(
    entityHandle: string,
    config: SaplingFormConfigPayload | unknown,
    templates: EntityTemplateDto[],
  ): SaplingFormConfigValidationResultDto {
    const errors: SaplingFormConfigValidationIssueDto[] = [];
    const warnings: SaplingFormConfigValidationIssueDto[] = [];
    const templateNames = new Set(templates.map((template) => template.name));
    const normalizedConfig = this.normalizeConfig(entityHandle, config, errors);

    if (normalizedConfig.entityHandle !== entityHandle) {
      errors.push({
        path: 'entityHandle',
        message: 'exception.formConfigEntityMismatch',
      });
    }

    for (const fieldName of Object.keys(normalizedConfig.fields)) {
      if (!templateNames.has(fieldName)) {
        warnings.push({
          path: `fields.${fieldName}`,
          message: 'exception.formConfigUnknownField',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedConfig,
    };
  }

  async getEffectiveTemplate(
    entityHandle: string,
    templates: EntityTemplateDto[],
    person?: PersonItem | null,
  ): Promise<EntityTemplateDto[]> {
    const configs = await this.findApplicableConfigs(entityHandle, person);
    const mergedFields = this.mergeFieldConfigs(configs);

    return templates.map((template) => {
      const fieldConfig = mergedFields[template.name];
      if (!fieldConfig) {
        return template;
      }

      return this.applyFieldConfig(template, fieldConfig);
    });
  }

  private async findApplicableConfigs(
    entityHandle: string,
    person?: PersonItem | null,
  ): Promise<NormalizedSaplingFormConfig[]> {
    const roleHandles = this.getPersonRoleHandles(person);
    const personHandle = person?.handle != null ? String(person.handle) : null;
    const items = await this.em.find(
      SaplingFormConfigItem,
      {
        entity: { handle: entityHandle },
        isActive: true,
      },
      {
        orderBy: { scope: 'ASC', isDefault: 'DESC', handle: 'ASC' },
      },
    );

    return items
      .filter((item) => this.isConfigApplicable(item, roleHandles, personHandle))
      .sort((left, right) => {
        const leftOrder = CONFIG_SCOPE_ORDER[left.scope] ?? 0;
        const rightOrder = CONFIG_SCOPE_ORDER[right.scope] ?? 0;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return (left.handle ?? 0) - (right.handle ?? 0);
      })
      .map((item) => this.normalizeConfig(entityHandle, item.config, []));
  }

  private isConfigApplicable(
    item: SaplingFormConfigItem,
    roleHandles: Set<string>,
    personHandle: string | null,
  ): boolean {
    if (item.scope === 'global') {
      return true;
    }

    const scopeHandle = item.scopeHandle?.trim();
    if (!scopeHandle) {
      return false;
    }

    if (item.scope === 'role') {
      return roleHandles.has(scopeHandle);
    }

    return personHandle === scopeHandle;
  }

  private getPersonRoleHandles(person?: PersonItem | null): Set<string> {
    const roles = person?.roles;
    if (!roles) {
      return new Set<string>();
    }

    const values =
      typeof (roles as { getItems?: () => unknown }).getItems === 'function'
        ? ((roles as { getItems: () => unknown }).getItems() as unknown)
        : roles;

    if (!Array.isArray(values)) {
      return new Set<string>();
    }

    return new Set(
      values
        .map((role) =>
          role && typeof role === 'object'
            ? String((role as { handle?: unknown }).handle ?? '')
            : '',
        )
        .filter(Boolean),
    );
  }

  private mergeFieldConfigs(
    configs: NormalizedSaplingFormConfig[],
  ): Record<string, SaplingFormFieldConfig> {
    const merged: Record<string, SaplingFormFieldConfig> = {};

    for (const config of configs) {
      for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        merged[fieldName] = {
          ...(merged[fieldName] ?? {}),
          ...fieldConfig,
        };
      }
    }

    return merged;
  }

  private applyFieldConfig(
    template: EntityTemplateDto,
    fieldConfig: SaplingFormFieldConfig,
  ): EntityTemplateDto {
    const nextTemplate = {
      ...template,
      formConfig: fieldConfig,
    };

    if (Object.prototype.hasOwnProperty.call(fieldConfig, 'group')) {
      nextTemplate.formGroup = fieldConfig.group ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(fieldConfig, 'groupOrder')) {
      nextTemplate.formGroupOrder = fieldConfig.groupOrder ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(fieldConfig, 'order')) {
      nextTemplate.formOrder = fieldConfig.order ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(fieldConfig, 'width')) {
      nextTemplate.formWidth = fieldConfig.width ?? null;
    }
    if (fieldConfig.required === true) {
      nextTemplate.isRequired = true;
    }
    if (fieldConfig.required === false && template.nullable !== false) {
      nextTemplate.isRequired = false;
    }

    return nextTemplate;
  }

  private normalizeConfig(
    entityHandle: string,
    config: SaplingFormConfigPayload | unknown,
    errors: SaplingFormConfigValidationIssueDto[],
  ): NormalizedSaplingFormConfig {
    const record =
      config && typeof config === 'object' && !Array.isArray(config)
        ? (config as Record<string, unknown>)
        : {};

    if (Object.keys(record).length === 0) {
      errors.push({
        path: '',
        message: 'exception.formConfigInvalidJson',
      });
    }

    const schema =
      record.schema === SAPLING_FORM_CONFIG_SCHEMA
        ? SAPLING_FORM_CONFIG_SCHEMA
        : SAPLING_FORM_CONFIG_SCHEMA;
    const configEntityHandle =
      typeof record.entityHandle === 'string' && record.entityHandle.trim()
        ? record.entityHandle.trim()
        : entityHandle;

    return {
      schema,
      entityHandle: configEntityHandle,
      fields: this.normalizeFields(record.fields),
      groups: this.normalizeRecord(record.groups),
      layout: this.normalizeRecord(record.layout),
      metadata: this.normalizeRecord(record.metadata),
    };
  }

  private normalizeFields(value: unknown): Record<string, SaplingFormFieldConfig> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const fields: Record<string, SaplingFormFieldConfig> = {};

    for (const [fieldName, fieldValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const normalizedFieldName = fieldName.trim();
      if (!normalizedFieldName) {
        continue;
      }

      fields[normalizedFieldName] = this.normalizeFieldConfig(fieldValue);
    }

    return fields;
  }

  private normalizeFieldConfig(value: unknown): SaplingFormFieldConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const record = value as Record<string, unknown>;
    const fieldConfig: SaplingFormFieldConfig = {};

    this.setBoolean(record, fieldConfig, 'visible');
    this.setBoolean(record, fieldConfig, 'required');
    this.setBoolean(record, fieldConfig, 'readonly');
    this.setNullableString(record, fieldConfig, 'group');
    this.setNullableString(record, fieldConfig, 'label');
    this.setNullableString(record, fieldConfig, 'helpText');
    this.setNullableString(record, fieldConfig, 'placeholder');
    this.setNullableNumber(record, fieldConfig, 'groupOrder');
    this.setNullableNumber(record, fieldConfig, 'order');
    this.setNullableWidth(record, fieldConfig, 'width');
    this.setRenderer(record, fieldConfig);

    if (Object.prototype.hasOwnProperty.call(record, 'defaultValue')) {
      fieldConfig.defaultValue = record.defaultValue;
    }
    if (Array.isArray(record.validation)) {
      fieldConfig.validation = record.validation;
    }
    if (this.isPlainRecord(record.condition) || record.condition === null) {
      fieldConfig.condition = record.condition as Record<string, unknown> | null;
    }
    if (this.isPlainRecord(record.referenceFilter) || record.referenceFilter === null) {
      fieldConfig.referenceFilter = record.referenceFilter as
        | Record<string, unknown>
        | null;
    }

    return fieldConfig;
  }

  private setBoolean(
    source: Record<string, unknown>,
    target: SaplingFormFieldConfig,
    key: 'visible' | 'required' | 'readonly',
  ): void {
    if (typeof source[key] === 'boolean') {
      target[key] = source[key];
    }
  }

  private setNullableString(
    source: Record<string, unknown>,
    target: SaplingFormFieldConfig,
    key: 'group' | 'label' | 'helpText' | 'placeholder',
  ): void {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      return;
    }

    target[key] =
      typeof source[key] === 'string' && source[key].trim()
        ? source[key].trim()
        : null;
  }

  private setNullableNumber(
    source: Record<string, unknown>,
    target: SaplingFormFieldConfig,
    key: 'groupOrder' | 'order',
  ): void {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      return;
    }

    target[key] =
      typeof source[key] === 'number' && Number.isFinite(source[key])
        ? Math.trunc(source[key])
        : null;
  }

  private setNullableWidth(
    source: Record<string, unknown>,
    target: SaplingFormFieldConfig,
    key: 'width',
  ): void {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      return;
    }

    target[key] =
      typeof source[key] === 'number' && Number.isFinite(source[key])
        ? (Math.max(1, Math.min(4, Math.trunc(source[key]))) as SaplingFormFieldWidth)
        : null;
  }

  private setRenderer(
    source: Record<string, unknown>,
    target: SaplingFormFieldConfig,
  ): void {
    if (!Object.prototype.hasOwnProperty.call(source, 'renderer')) {
      return;
    }

    if (typeof source.renderer !== 'string') {
      target.renderer = null;
      return;
    }

    const renderer = source.renderer.trim() as SaplingFormRenderer;
    target.renderer = FIELD_RENDERERS.has(renderer) ? renderer : null;
  }

  private normalizeRecord(value: unknown): Record<string, unknown> {
    return this.isPlainRecord(value) ? { ...value } : {};
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private normalizeScope(scope: unknown): SaplingFormConfigScope {
    return scope === 'role' || scope === 'person' ? scope : 'global';
  }

  private normalizeRequiredString(value: unknown, path: string): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    throw new BadRequestException(`${path}: exception.badRequest`);
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
