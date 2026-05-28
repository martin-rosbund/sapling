import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, type EntityName, wrap } from '@mikro-orm/core';
import { AiEntityGenerationTemplateItem } from '../../entity/AiEntityGenerationTemplateItem';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { PermissionItem } from '../../entity/PermissionItem';
import { RoleItem } from '../../entity/RoleItem';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { AiProviderRegistryService } from '../ai/ai-provider-registry.service';
import { createGeminiClient } from '../ai/gemini-ai.runtime';
import { createOpenAiClient } from '../ai/openai-ai.runtime';
import {
  extractModelHandle,
  extractProviderHandle,
} from '../ai/ai-response.utils';
import { GenericPermissionService } from '../generic/generic-permission.service';

type AiEntityGenerationParameter = {
  template?: string;
  templateHandle?: string;
};

type AiEntityGenerationOptions = {
  items: object[];
  sourceEntity: EntityItem;
  user: PersonItem;
  actionName: string;
  parameter?: unknown;
};

export type AiEntityGenerationResult = {
  templateHandle: string;
  targetEntityHandle: string;
  createdItem: Record<string, unknown>;
  payload: Record<string, unknown>;
};

const MAX_SOURCE_JSON_CHARS = 24000;

@Injectable()
export class AiEntityGenerationService {
  constructor(
    private readonly em: EntityManager,
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly genericPermissionService: GenericPermissionService,
  ) {}

  async generateFromScriptButton(
    options: AiEntityGenerationOptions,
  ): Promise<AiEntityGenerationResult> {
    if (options.items.length !== 1) {
      throw new BadRequestException(
        'aiEntityGeneration.singleSelectionRequired',
      );
    }

    const permissionUser = await this.loadPermissionUser(options.user);
    const sourceEntityHandle = this.requireEntityHandle(options.sourceEntity);
    const sourceHandle = this.requireSourceHandle(options.items[0]);
    const template = await this.loadTemplate(
      sourceEntityHandle,
      options.actionName,
      options.parameter,
    );
    const targetEntityHandle = this.requireEntityHandle(template.targetEntity);

    this.assertPermission(permissionUser, sourceEntityHandle, 'allowRead');
    this.assertPermission(permissionUser, targetEntityHandle, 'allowInsert');

    const sourceRecord = await this.loadSourceRecord(
      sourceEntityHandle,
      sourceHandle,
      template,
    );
    const generatedFields = await this.generateFields(
      template,
      sourceEntityHandle,
      targetEntityHandle,
      sourceRecord,
    );
    const payload = this.buildTargetPayload(
      template,
      generatedFields,
      sourceRecord,
      sourceHandle,
      permissionUser,
    );
    this.genericPermissionService.checkTopLevelPermission(
      targetEntityHandle,
      payload,
      permissionUser,
      'allowInsertStage',
    );
    const createdItem = await this.createTargetRecord(
      targetEntityHandle,
      payload,
    );

    return {
      templateHandle: template.handle,
      targetEntityHandle,
      createdItem,
      payload,
    };
  }

  private async loadTemplate(
    sourceEntityHandle: string,
    actionName: string,
    parameter?: unknown,
  ): Promise<AiEntityGenerationTemplateItem> {
    const templateHandle = this.extractTemplateHandle(parameter);
    const template = await this.em.findOne(
      AiEntityGenerationTemplateItem,
      {
        isActive: true,
        actionName,
        sourceEntity: { handle: sourceEntityHandle },
        ...(templateHandle ? { handle: templateHandle } : {}),
      },
      {
        populate: ['sourceEntity', 'targetEntity', 'provider', 'model'],
        orderBy: { sortOrder: 'ASC', title: 'ASC' },
      },
    );

    if (!template) {
      throw new NotFoundException('aiEntityGeneration.templateNotFound');
    }

    return template;
  }

  private async loadSourceRecord(
    sourceEntityHandle: string,
    sourceHandle: string | number,
    template: AiEntityGenerationTemplateItem,
  ): Promise<object> {
    const sourceEntityClass = this.getEntityClass(sourceEntityHandle);

    const sourceRecord = await this.em.findOne(
      sourceEntityClass,
      { handle: sourceHandle },
      {
        populate: this.normalizeRelations(template.sourceRelations) as never[],
      },
    );

    if (!sourceRecord) {
      throw new NotFoundException('global.notFound');
    }

    return sourceRecord;
  }

  private async generateFields(
    template: AiEntityGenerationTemplateItem,
    sourceEntityHandle: string,
    targetEntityHandle: string,
    sourceRecord: object,
  ): Promise<Record<string, unknown>> {
    const providerHandle = extractProviderHandle(template.provider);
    const modelHandle = extractModelHandle(template.model);
    const runtimeTarget = await this.providerRegistry.resolveRuntimeTarget(
      providerHandle,
      modelHandle,
    );
    const systemPrompt = this.buildSystemPrompt(template, targetEntityHandle);
    const userPrompt = this.buildUserPrompt(
      template,
      sourceEntityHandle,
      targetEntityHandle,
      sourceRecord,
    );
    const rawText =
      runtimeTarget.providerKind === 'gemini'
        ? await this.generateGeminiText(
            runtimeTarget.provider,
            runtimeTarget.model.providerModel,
            systemPrompt,
            userPrompt,
          )
        : await this.generateOpenAiText(
            runtimeTarget.provider,
            runtimeTarget.model.providerModel,
            systemPrompt,
            userPrompt,
          );

    return this.parseJsonObject(rawText);
  }

  private async generateOpenAiText(
    provider: Parameters<typeof createOpenAiClient>[0],
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await createOpenAiClient(provider).chat.completions.create(
      {
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
    );

    return response.choices[0]?.message?.content ?? '';
  }

  private async generateGeminiText(
    provider: Parameters<typeof createGeminiClient>[0],
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const model = createGeminiClient(provider).getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.2,
      },
    });
    const result = await model.generateContent(userPrompt);

    return result.response.text();
  }

  private buildTargetPayload(
    template: AiEntityGenerationTemplateItem,
    generatedFields: Record<string, unknown>,
    sourceRecord: object,
    sourceHandle: string | number,
    user: PersonItem,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      ...(this.normalizeRecord(template.targetDefaults) ?? {}),
    };
    const fieldMapping = this.normalizeFieldMapping(template.fieldMapping);

    if (Object.keys(fieldMapping).length > 0) {
      for (const [generatedField, targetField] of Object.entries(
        fieldMapping,
      )) {
        if (!this.hasOwn(generatedFields, generatedField)) {
          continue;
        }

        const generatedValue = this.normalizeGeneratedValue(
          generatedFields[generatedField],
        );
        if (typeof generatedValue !== 'undefined') {
          payload[targetField] = generatedValue;
        }
      }
    } else {
      for (const [field, value] of Object.entries(generatedFields)) {
        const generatedValue = this.normalizeGeneratedValue(value);
        if (typeof generatedValue !== 'undefined') {
          payload[field] = generatedValue;
        }
      }
    }

    this.applySourceFieldMapping(
      payload,
      sourceRecord,
      template.sourceFieldMapping,
    );

    if (template.sourceReferenceField?.trim()) {
      payload[template.sourceReferenceField.trim()] = sourceHandle;
    }

    if (template.userReferenceField?.trim() && user.handle != null) {
      payload[template.userReferenceField.trim()] = user.handle;
    }

    return payload;
  }

  private async createTargetRecord(
    targetEntityHandle: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const targetEntityClass = this.getEntityClass(targetEntityHandle);

    const entity = this.em.create(targetEntityClass, payload as never);
    await this.em.persist(entity).flush();

    return this.toPlainRecord(entity);
  }

  private buildSystemPrompt(
    template: AiEntityGenerationTemplateItem,
    targetEntityHandle: string,
  ): string {
    const fieldMapping = this.normalizeFieldMapping(template.fieldMapping);
    const responseFields = Object.keys(fieldMapping);

    return [
      'You create structured Sapling CRM records from existing entity data.',
      'Return exactly one valid JSON object and no markdown fences.',
      'Do not invent facts that are missing from the source record.',
      'Remove secrets, credentials, and unnecessary customer-identifying details.',
      `Target entity: ${targetEntityHandle}.`,
      responseFields.length > 0
        ? `The JSON object must use these keys: ${responseFields.join(', ')}.`
        : 'The JSON object must use target entity field names as keys.',
      'Keep markdown only inside markdown fields.',
    ].join('\n');
  }

  private buildUserPrompt(
    template: AiEntityGenerationTemplateItem,
    sourceEntityHandle: string,
    targetEntityHandle: string,
    sourceRecord: object,
  ): string {
    const sourceJson = this.stringifySourceRecord(sourceRecord);

    return [
      `Template: ${template.title} (${template.handle})`,
      `Source entity: ${sourceEntityHandle}`,
      `Target entity: ${targetEntityHandle}`,
      '',
      'Template instructions:',
      template.promptMarkdown,
      '',
      'Source record JSON:',
      sourceJson,
    ].join('\n');
  }

  private stringifySourceRecord(sourceRecord: object): string {
    const sourcePlain = this.toPlainRecord(sourceRecord);
    const json = JSON.stringify(
      this.pruneSensitiveValues(sourcePlain),
      null,
      2,
    );

    if (json.length <= MAX_SOURCE_JSON_CHARS) {
      return json;
    }

    return `${json.slice(0, MAX_SOURCE_JSON_CHARS)}\n... truncated ...`;
  }

  private parseJsonObject(rawText: string): Record<string, unknown> {
    const text = rawText
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new BadRequestException('aiEntityGeneration.invalidJsonResponse');
    }

    try {
      const parsed: unknown = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected JSON object');
      }

      return parsed as Record<string, unknown>;
    } catch {
      throw new BadRequestException('aiEntityGeneration.invalidJsonResponse');
    }
  }

  private async loadPermissionUser(user: PersonItem): Promise<PersonItem> {
    if (!user?.handle) {
      throw new ForbiddenException('global.permissionDenied');
    }

    const loadedUser = await this.em.findOne(
      PersonItem,
      { handle: user.handle },
      { populate: ['roles.permissions.entity', 'company'] },
    );

    return loadedUser ?? user;
  }

  private assertPermission(
    user: PersonItem,
    entityHandle: string,
    permissionKey: 'allowRead' | 'allowInsert',
  ): void {
    for (const role of this.toArray<RoleItem>(user.roles)) {
      for (const permission of this.toArray<PermissionItem>(role.permissions)) {
        const permissionEntityHandle = this.extractPermissionEntityHandle(
          permission.entity,
        );

        if (
          permissionEntityHandle === entityHandle &&
          permission[permissionKey] === true
        ) {
          return;
        }
      }
    }

    throw new ForbiddenException('global.permissionDenied');
  }

  private extractPermissionEntityHandle(entity: unknown): string | null {
    if (typeof entity === 'string') {
      return entity;
    }

    if (entity && typeof entity === 'object' && 'handle' in entity) {
      const handle = (entity as { handle?: unknown }).handle;
      return typeof handle === 'string' ? handle : null;
    }

    return null;
  }

  private requireEntityHandle(entity: EntityItem | string): string {
    const handle = typeof entity === 'string' ? entity : entity?.handle;

    if (!handle || typeof handle !== 'string') {
      throw new BadRequestException('global.entityNotFound');
    }

    return handle;
  }

  private getEntityClass(entityHandle: string): EntityName<object> {
    const entityClass = ENTITY_MAP[entityHandle] as
      | EntityName<object>
      | undefined;

    if (!entityClass) {
      throw new NotFoundException('global.entityNotFound');
    }

    return entityClass;
  }

  private requireSourceHandle(item: object): string | number {
    const handle = (item as { handle?: unknown }).handle;

    if (typeof handle === 'string' || typeof handle === 'number') {
      return handle;
    }

    throw new BadRequestException('global.invalidPayload');
  }

  private extractTemplateHandle(parameter?: unknown): string | undefined {
    const normalized = this.normalizeRecord(
      parameter,
    ) as AiEntityGenerationParameter | null;
    const template = normalized?.template ?? normalized?.templateHandle;

    return typeof template === 'string' && template.trim()
      ? template.trim()
      : undefined;
  }

  private normalizeRelations(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (relation): relation is string =>
        typeof relation === 'string' && relation.trim().length > 0,
    );
  }

  private normalizeRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private normalizeFieldMapping(value: unknown): Record<string, string> {
    const record = this.normalizeRecord(value);

    if (!record) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(record)
        .map(([key, targetField]) => [
          key.trim(),
          typeof targetField === 'string' ? targetField.trim() : '',
        ])
        .filter(
          (entry): entry is [string, string] =>
            entry[0].length > 0 && entry[1].length > 0,
        ),
    );
  }

  private applySourceFieldMapping(
    payload: Record<string, unknown>,
    sourceRecord: object,
    sourceFieldMapping: unknown,
  ): void {
    const fieldMapping = this.normalizeFieldMapping(sourceFieldMapping);

    if (Object.keys(fieldMapping).length === 0) {
      return;
    }

    const sourcePlain = this.toPlainRecord(sourceRecord);

    for (const [sourcePath, targetField] of Object.entries(fieldMapping)) {
      const copiedValue = this.normalizeCopiedSourceValue(
        this.readSourcePath(sourcePlain, sourcePath),
      );

      if (typeof copiedValue !== 'undefined') {
        payload[targetField] = copiedValue;
      }
    }
  }

  private normalizeGeneratedValue(value: unknown): unknown {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value == null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) =>
          typeof entry === 'string' || typeof entry === 'number'
            ? String(entry).trim()
            : '',
        )
        .filter(Boolean)
        .join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  }

  private readSourcePath(sourceRecord: unknown, sourcePath: string): unknown {
    return sourcePath
      .split('.')
      .filter(Boolean)
      .reduce<unknown>((currentValue, pathSegment) => {
        if (currentValue == null) {
          return undefined;
        }

        if (Array.isArray(currentValue)) {
          const pathIndex = Number.parseInt(pathSegment, 10);
          return Number.isInteger(pathIndex) &&
            String(pathIndex) === pathSegment
            ? currentValue[pathIndex]
            : undefined;
        }

        if (typeof currentValue !== 'object') {
          return undefined;
        }

        return (currentValue as Record<string, unknown>)[pathSegment];
      }, sourceRecord);
  }

  private normalizeCopiedSourceValue(value: unknown): unknown {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value == null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.normalizeCopiedSourceValue(entry))
        .filter((entry) => typeof entry !== 'undefined');
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return this.hasOwn(record, 'handle') ? record.handle : record;
    }

    return value;
  }

  private toPlainRecord(value: object): Record<string, unknown> {
    try {
      return wrap(value).toObject() as Record<string, unknown>;
    } catch {
      return { ...(value as Record<string, unknown>) };
    }
  }

  private pruneSensitiveValues(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.pruneSensitiveValues(entry));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !this.isSensitiveKey(key))
        .map(([key, entry]) => [key, this.pruneSensitiveValues(entry)]),
    );
  }

  private isSensitiveKey(key: string): boolean {
    return /password|secret|token|credential|apiKey|privateKey/i.test(key);
  }

  private toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }

    if (value && typeof value === 'object') {
      const collection = value as {
        getItems?: () => T[];
        toArray?: () => T[];
        [Symbol.iterator]?: () => Iterator<T>;
      };

      if (typeof collection.getItems === 'function') {
        return collection.getItems();
      }

      if (typeof collection.toArray === 'function') {
        return collection.toArray();
      }

      if (typeof collection[Symbol.iterator] === 'function') {
        return Array.from(collection as Iterable<T>);
      }
    }

    return [];
  }

  private hasOwn(record: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(record, key) === true;
  }
}
