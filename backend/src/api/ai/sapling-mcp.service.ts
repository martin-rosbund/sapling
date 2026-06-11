import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import { GenericService } from '../generic/generic.service';
import { CurrentService } from '../current/current.service';
import { TemplateService } from '../template/template.service';
import { ImportService } from '../import/import.service';
import type {
  ConfigureImportBatchDto,
  ImportAiSuggestDto,
} from '../import/import.types';
import { PersonItem } from '../../entity/PersonItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { AiService } from './ai.service';
import { SAPLING_MCP_TOOL_DEFINITIONS } from './sapling-mcp-tool-definitions';
import { SAPLING_MCP_USAGE_HINTS } from './prompts/sapling-mcp.prompts';
import { SaplingMcpPermissionService } from './sapling-mcp-permission.service';
import type { McpToolPolicy } from './mcp-policy.types';

type SaplingMcpSession = {
  transport: StreamableHTTPServerTransport;
  userHandle: number;
};

@Injectable()
export class SaplingMcpService {
  private readonly transports = new Map<string, SaplingMcpSession>();
  private readonly internalServerName = 'sapling';
  private readonly defaultKnowledgeSearchEntityHandles = [
    'knowledgeArticle',
    'ticket',
    'effortEstimate',
    'effortEstimatePosition',
    'salesOpportunity',
  ];

  constructor(
    private readonly genericService: GenericService,
    private readonly currentService: CurrentService,
    private readonly templateService: TemplateService,
    private readonly importService: ImportService,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    private readonly permissionService: SaplingMcpPermissionService,
  ) {}

  listTools(): Promise<
    Array<{
      toolName: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  > {
    return Promise.resolve(
      SAPLING_MCP_TOOL_DEFINITIONS.map((tool) => ({
        toolName: tool.toolName,
        description: tool.description,
        inputSchema: { ...tool.jsonSchema },
      })),
    );
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<{ content: string; modelResult: unknown; rawResult: unknown }> {
    let payload: unknown;

    try {
      this.assertInternalToolAllowed(toolName, policy);

      switch (toolName) {
        case 'current_person':
          payload = await this.executeCurrentPerson(user);
          break;
        case 'entity_catalog':
          payload = this.executeEntityCatalog(policy);
          break;
        case 'entity_schema':
          payload = this.executeEntitySchema(args, policy);
          break;
        case 'entity_search':
          payload = this.executeEntitySearch(args, policy);
          break;
        case 'generic_list':
          payload = await this.executeGenericList(args, user, policy);
          break;
        case 'generic_get':
          payload = await this.executeGenericGet(args, user, policy);
          break;
        case 'generic_timeline':
          payload = await this.executeGenericTimeline(args, user, policy);
          break;
        case 'ticket_search':
          payload = await this.executeTicketSearch(args, user, policy);
          break;
        case 'semantic_search':
          payload = await this.executeSemanticSearch(args, user, policy);
          break;
        case 'knowledge_search':
          payload = await this.executeKnowledgeSearch(args, user, policy);
          break;
        case 'import_get_batch':
          payload = await this.executeImportGetBatch(args, user, policy);
          break;
        case 'import_list_templates':
          payload = await this.executeImportListTemplates(args, user, policy);
          break;
        case 'import_suggest_mapping':
          payload = await this.executeImportSuggestMapping(args, user, policy);
          break;
        case 'import_match_existing_records':
          payload = await this.executeImportMatchExistingRecords(
            args,
            user,
            policy,
          );
          break;
        case 'import_configure_batch':
          payload = await this.executeImportConfigureBatch(args, user, policy);
          break;
        case 'import_execute_batch':
          payload = await this.executeImportExecuteBatch(args, user, policy);
          break;
        case 'generic_create':
          payload = await this.executeGenericCreate(args, user, policy);
          break;
        case 'generic_update':
          payload = await this.executeGenericUpdate(args, user, policy);
          break;
        case 'generic_delete':
          payload = await this.executeGenericDelete(args, user, policy);
          break;
        default:
          throw new ForbiddenException('ai.mcpToolNotFound');
      }
    } catch (error) {
      payload = this.createToolErrorPayload(toolName, error);
    }

    const modelResult = this.createModelResult(toolName, payload, args);

    return {
      content: JSON.stringify(modelResult, null, 2),
      modelResult,
      rawResult: payload,
    };
  }

  getServerName(): string {
    return this.internalServerName;
  }

  async handlePost(
    req: Request & { user: PersonItem },
    res: Response,
  ): Promise<void> {
    const sessionId = this.readSessionId(req);

    try {
      if (sessionId) {
        const session = this.requireOwnedSession(sessionId, req.user);
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          this.transports.set(initializedSessionId, {
            transport,
            userHandle: this.requireUserHandle(req.user),
          });
        },
      });

      transport.onclose = () => {
        const activeSessionId = transport.sessionId;
        if (activeSessionId) {
          this.transports.delete(activeSessionId);
        }
      };

      const server = this.createServer(req.user);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.handleTransportError(error, res);
    }
  }

  async handleGet(
    req: Request & { user: PersonItem },
    res: Response,
  ): Promise<void> {
    try {
      const session = this.requireOwnedSession(
        this.readSessionId(req),
        req.user,
      );
      await session.transport.handleRequest(req, res);
    } catch (error) {
      this.handleTransportError(error, res);
    }
  }

  async handleDelete(
    req: Request & { user: PersonItem },
    res: Response,
  ): Promise<void> {
    try {
      const sessionId = this.readSessionId(req);
      const session = this.requireOwnedSession(sessionId, req.user);
      await session.transport.handleRequest(req, res);
      if (sessionId) {
        this.transports.delete(sessionId);
      }
    } catch (error) {
      this.handleTransportError(error, res);
    }
  }

  private createServer(user: PersonItem): McpServer {
    const server = new McpServer({
      name: 'sapling-mcp-server',
      version: '1.0.0',
    });

    for (const tool of SAPLING_MCP_TOOL_DEFINITIONS) {
      server.registerTool(
        tool.toolName,
        {
          description: tool.description,
          inputSchema: tool.serverInputSchema,
        },
        async (args: Record<string, unknown> = {}) => {
          const result = await this.executeTool(tool.toolName, args, user);
          return this.createJsonContent(result.modelResult);
        },
      );
    }

    return server;
  }

  private createJsonContent(payload: unknown) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }

  private createModelResult(
    toolName: string,
    payload: unknown,
    args: Record<string, unknown>,
  ): unknown {
    if (this.isToolErrorPayload(payload)) {
      return payload;
    }

    switch (toolName) {
      case 'current_person':
        return this.sanitizeUnknownValue(payload);
      case 'generic_list':
      case 'ticket_search':
        return this.createModelListResult(payload, args);
      case 'generic_get':
        return this.createModelGetResult(payload);
      case 'semantic_search':
        return this.createModelSemanticSearchResult(payload);
      case 'knowledge_search':
        return this.createModelKnowledgeSearchResult(payload);
      case 'import_get_batch':
      case 'import_suggest_mapping':
      case 'import_configure_batch':
      case 'import_execute_batch':
        return this.createModelImportBatchResult(payload);
      case 'import_list_templates':
        return this.createModelImportTemplateListResult(payload);
      case 'import_match_existing_records':
        return this.createModelImportMatchResult(payload);
      case 'generic_create':
      case 'generic_update':
        return this.createModelMutationResult(payload, args);
      case 'generic_delete':
        return this.createModelDeleteResult(payload);
      case 'generic_timeline':
        return this.sanitizeUnknownValue(payload);
      default:
        return payload;
    }
  }

  private createModelListResult(
    payload: unknown,
    args: Record<string, unknown>,
  ): unknown {
    const record = this.asRecord(payload);
    const entityHandle =
      this.asStringValue(record.entityHandle) ??
      this.asStringValue(args.entityHandle);

    if (!entityHandle) {
      return this.sanitizeUnknownValue(payload);
    }

    return {
      ...this.copyModelResultMetadata(record, [
        'entityHandle',
        'query',
        'searchMode',
        'searchFields',
        'meta',
        'usageHints',
      ]),
      entityHandle,
      data: Array.isArray(record.data)
        ? record.data.map((item) =>
            this.sanitizeEntityRecord(entityHandle, item),
          )
        : [],
    };
  }

  private createModelGetResult(payload: unknown): unknown {
    const record = this.asRecord(payload);
    const entityHandle = this.asStringValue(record.entityHandle);
    const sourceRecord = this.asEntityRecord(record.record);

    if (!entityHandle || !sourceRecord) {
      return this.sanitizeUnknownValue(payload);
    }

    return {
      entityHandle,
      found: record.found === true,
      displayValue: this.buildRecordDisplayValue(entityHandle, sourceRecord),
      record: this.sanitizeEntityRecord(entityHandle, sourceRecord),
      usageHints: [
        ...SAPLING_MCP_USAGE_HINTS.genericGet,
        ...SAPLING_MCP_USAGE_HINTS.userFacingValues,
      ],
    };
  }

  private createModelSemanticSearchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);
    const entityHandle = this.asStringValue(record.entityHandle);

    if (!entityHandle) {
      return this.sanitizeUnknownValue(payload);
    }

    return {
      ...this.copyModelResultMetadata(record, [
        'entityHandle',
        'query',
        'indexed',
        'searchableSections',
        'usageHints',
      ]),
      results: this.sanitizeSearchResults(entityHandle, record.results),
    };
  }

  private createModelKnowledgeSearchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);
    const results = Array.isArray(record.results) ? record.results : [];

    return {
      ...this.copyModelResultMetadata(record, [
        'query',
        'entityHandles',
        'indexedEntityHandles',
        'unindexedEntityHandles',
        'skippedEntityHandles',
        'errors',
        'usageHints',
      ]),
      results: results
        .map((item) => {
          const result = this.asRecord(item);
          const entityHandle = this.asStringValue(result.entityHandle);
          const sourceRecord = this.asEntityRecord(result.record);

          if (!entityHandle) {
            return this.sanitizeUnknownValue(item);
          }

          return {
            entityHandle,
            score: this.asScore(result.score),
            displayValue: sourceRecord
              ? this.buildRecordDisplayValue(entityHandle, sourceRecord)
              : null,
            record: sourceRecord
              ? this.sanitizeEntityRecord(entityHandle, sourceRecord)
              : null,
            matches: this.sanitizeUnknownValue(result.matches),
          };
        })
        .filter((item) => item != null),
    };
  }

  private createModelImportBatchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);

    return {
      ...this.copyModelResultMetadata(record, [
        'handle',
        'status',
        'filename',
        'mimetype',
        'fileSize',
        'sourceHandle',
        'entityHandle',
        'templateHandle',
        'rowCount',
        'readyCount',
        'errorCount',
        'createdCount',
        'updatedCount',
        'skippedCount',
        'failedCount',
        'delimiter',
        'headers',
        'sampleRows',
        'mapping',
        'externalKeyColumns',
        'genericReferenceMapping',
        'executedAt',
        'warnings',
        'providerHandle',
        'modelHandle',
      ]),
      rows: Array.isArray(record.rows)
        ? record.rows.slice(0, 20).map((row) => this.sanitizeUnknownValue(row))
        : [],
      usageHints: [...SAPLING_MCP_USAGE_HINTS.importTools],
    };
  }

  private createModelImportTemplateListResult(payload: unknown): unknown {
    const templates = Array.isArray(payload) ? payload : [];

    return {
      templates: templates.map((template) =>
        this.sanitizeUnknownValue(template),
      ),
      usageHints: [...SAPLING_MCP_USAGE_HINTS.importTools],
    };
  }

  private createModelImportMatchResult(payload: unknown): unknown {
    const record = this.asRecord(payload);

    return {
      ...this.copyModelResultMetadata(record, [
        'batchHandle',
        'entityHandle',
        'sourceColumns',
        'targetFields',
        'sampledRows',
        'checkedValues',
        'matchCount',
      ]),
      matches: Array.isArray(record.matches)
        ? record.matches.map((item) => this.sanitizeUnknownValue(item))
        : [],
      usageHints: [...SAPLING_MCP_USAGE_HINTS.importTools],
    };
  }

  private createModelMutationResult(
    payload: unknown,
    args: Record<string, unknown>,
  ): unknown {
    const record = this.asRecord(payload);
    const entityHandle =
      this.asStringValue(record.entityHandle) ??
      this.asStringValue(args.entityHandle);

    if (!entityHandle) {
      return this.sanitizeUnknownValue(payload);
    }

    return this.sanitizeEntityRecord(entityHandle, record);
  }

  private createModelDeleteResult(payload: unknown): unknown {
    const record = this.asRecord(payload);

    return {
      success: record.success === true,
      entityHandle: this.asStringValue(record.entityHandle),
      usageHints: [...SAPLING_MCP_USAGE_HINTS.userFacingValues],
    };
  }

  private sanitizeSearchResults(
    entityHandle: string,
    value: unknown,
  ): unknown[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        const result = this.asRecord(item);
        const sourceRecord = this.asEntityRecord(result.record);

        return {
          score: this.asScore(result.score),
          displayValue: sourceRecord
            ? this.buildRecordDisplayValue(entityHandle, sourceRecord)
            : null,
          record: sourceRecord
            ? this.sanitizeEntityRecord(entityHandle, sourceRecord)
            : null,
          matches: this.sanitizeUnknownValue(result.matches),
        };
      })
      .filter((item) => item.record != null || item.displayValue != null);
  }

  private sanitizeEntityRecord(entityHandle: string, value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeEntityRecord(entityHandle, item));
    }

    const record = this.asEntityRecord(value);

    if (!record) {
      return this.sanitizeUnknownValue(value);
    }

    const template = this.getEntityTemplate(entityHandle);
    const fieldsByName = new Map(template.map((field) => [field.name, field]));
    const sanitizedRecord: Record<string, unknown> = {};
    const displayValue = this.buildRecordDisplayValue(entityHandle, record);

    if (displayValue) {
      sanitizedRecord.displayValue = displayValue;
    }

    for (const [key, rawValue] of Object.entries(record)) {
      const field = fieldsByName.get(key);

      if (this.isInternalIdentifierKey(key) || field?.isPrimaryKey) {
        continue;
      }

      if (field?.options?.includes('isSecurity')) {
        continue;
      }

      if (field?.isReference && field.referenceName) {
        sanitizedRecord[key] = this.sanitizeEntityRecord(
          field.referenceName,
          rawValue,
        );
        continue;
      }

      sanitizedRecord[key] = this.sanitizeUnknownValue(rawValue);
    }

    return sanitizedRecord;
  }

  private sanitizeUnknownValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeUnknownValue(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const record = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};

    for (const [key, rawValue] of Object.entries(record)) {
      if (this.isInternalIdentifierKey(key)) {
        continue;
      }

      sanitizedRecord[key] = this.sanitizeUnknownValue(rawValue);
    }

    return sanitizedRecord;
  }

  private buildRecordDisplayValue(
    entityHandle: string,
    record: Record<string, unknown>,
  ): string | null {
    const template = this.getEntityTemplate(entityHandle);
    const valueFieldNames = template
      .filter((field) => field.options?.includes('isValue'))
      .map((field) => field.name);
    const valueParts = valueFieldNames
      .map((fieldName) => this.formatDisplayValuePart(record[fieldName]))
      .filter((part): part is string => !!part);

    if (valueParts.length > 0) {
      return valueParts.join(' ');
    }

    const fallbackParts = [
      this.formatDisplayValuePart(record.title),
      this.formatDisplayValuePart(record.name),
      this.formatDisplayValuePart(record.number),
      this.formatDisplayValuePart(record.description),
      this.formatDisplayValuePart(record.subject),
      this.formatPersonDisplayValue(record),
      this.formatDisplayValuePart(record.email),
    ].filter((part): part is string => !!part);

    return fallbackParts[0] ?? null;
  }

  private formatPersonDisplayValue(
    record: Record<string, unknown>,
  ): string | null {
    const name = [
      this.formatDisplayValuePart(record.firstName),
      this.formatDisplayValuePart(record.lastName),
    ]
      .filter((part): part is string => !!part)
      .join(' ')
      .trim();

    return name || null;
  }

  private formatDisplayValuePart(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      const normalized = String(value).trim();
      return normalized || null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return null;
  }

  private copyModelResultMetadata(
    record: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    for (const key of keys) {
      if (key in record) {
        metadata[key] = this.sanitizeUnknownValue(record[key]);
      }
    }

    const usageHints = metadata.usageHints;
    if (Array.isArray(usageHints)) {
      const normalizedUsageHints = usageHints.filter(
        (hint): hint is unknown => typeof hint !== 'undefined',
      );
      metadata.usageHints = [
        ...normalizedUsageHints,
        ...SAPLING_MCP_USAGE_HINTS.userFacingValues,
      ];
    }

    return metadata;
  }

  private isToolErrorPayload(payload: unknown): boolean {
    return !!(
      payload &&
      typeof payload === 'object' &&
      (payload as { ok?: unknown }).ok === false
    );
  }

  private isInternalIdentifierKey(key: string): boolean {
    return (
      key === 'handle' ||
      key === 'id' ||
      key.endsWith('Handle') ||
      key.endsWith('Id') ||
      key.endsWith('_handle') ||
      key.endsWith('_id')
    );
  }

  private asStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private async executeGenericList(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowRead',
    );
    const filter = this.normalizeEntityCriteria(
      entityHandle,
      this.asRecord(args.filter),
    );
    const orderBy = this.normalizeEntitySort(
      entityHandle,
      this.asRecord(args.orderBy),
    );
    const relations = this.normalizeEntityRelations(
      entityHandle,
      this.asStringArray(args.relations),
    );
    const page = this.asPositiveNumber(args.page) ?? 1;
    const limit = this.asPositiveNumber(args.limit) ?? 50;

    return this.genericService.findAndCount(
      entityHandle,
      filter,
      page,
      limit,
      orderBy,
      user,
      relations,
    );
  }

  private async executeCurrentPerson(user: PersonItem): Promise<unknown> {
    const person = (await this.currentService.getPerson(user)) ?? user;
    const personRecord = person as unknown as Record<string, unknown>;
    const company = this.asEntityRecord(personRecord.company);
    const department = this.asEntityRecord(personRecord.department);
    const language = this.asEntityRecord(personRecord.language);
    const type = this.asEntityRecord(personRecord.type);
    const workWeek = this.asEntityRecord(personRecord.workWeek);
    const roles = this.asCollectionRecords(personRecord.roles).map((role) => {
      const stage = this.asEntityRecord(role.stage);

      return {
        handle: this.asPrimitive(role.handle),
        title: this.asPrimitive(role.title),
        stage: stage
          ? {
              handle: this.asPrimitive(stage.handle),
              title: this.asPrimitive(stage.title),
            }
          : null,
      };
    });

    return {
      person: {
        handle: person.handle ?? null,
        fullName: `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim(),
        firstName: person.firstName ?? null,
        lastName: person.lastName ?? null,
        loginName: person.loginName ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
        mobile: person.mobile ?? null,
        isActive: person.isActive ?? null,
        requirePasswordChange: person.requirePasswordChange ?? null,
        company: company
          ? {
              handle: this.asPrimitive(company.handle),
              name: this.asPrimitive(company.name),
              city: this.asPrimitive(company.city),
              email: this.asPrimitive(company.email),
            }
          : null,
        department: department
          ? {
              handle: this.asPrimitive(department.handle),
              description:
                this.asPrimitive(department.description) ??
                this.asPrimitive(department.title),
            }
          : null,
        language: language
          ? {
              handle: this.asPrimitive(language.handle),
              name: this.asPrimitive(language.name),
            }
          : null,
        type: type
          ? {
              handle: this.asPrimitive(type.handle),
              description:
                this.asPrimitive(type.description) ??
                this.asPrimitive(type.title),
            }
          : null,
        workWeek: workWeek
          ? {
              handle: this.asPrimitive(workWeek.handle),
              title: this.asPrimitive(workWeek.title),
            }
          : null,
        roles,
      },
      usageHints: [...SAPLING_MCP_USAGE_HINTS.currentPerson],
    };
  }

  private executeEntityCatalog(policy?: McpToolPolicy): { entities: string[] } {
    return {
      entities: this.filterPolicyEntityHandles(
        [...ENTITY_HANDLES],
        policy,
      ).sort((left, right) => left.localeCompare(right)),
    };
  }

  private executeEntitySchema(
    args: Record<string, unknown>,
    policy?: McpToolPolicy,
  ): {
    entityHandle: string;
    fields: Array<{
      name: string;
      type: string;
      kind: string | null | undefined;
      referenceName: string;
      isReference: boolean;
      isPrimaryKey: boolean;
      isAutoIncrement: boolean;
      isRequired: boolean;
      nullable: boolean;
      options: string[];
      mappedBy?: string | null;
      inversedBy?: string | null;
      referenceDependency?: Record<string, unknown> | null;
    }>;
    relationNames: string[];
    requiredFieldNames: string[];
    filterOperators: string[];
    usageHints: string[];
  } {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    const template = this.getEntityTemplate(entityHandle);

    return {
      entityHandle,
      fields: template.map((field) => ({
        name: field.name,
        type: field.type,
        kind: field.kind,
        referenceName: field.referenceName,
        isReference: field.isReference,
        isPrimaryKey: field.isPrimaryKey,
        isAutoIncrement: field.isAutoIncrement,
        isRequired: field.isRequired,
        nullable: field.nullable,
        options: [...field.options],
        mappedBy: field.mappedBy,
        inversedBy: field.inversedBy,
        referenceDependency: field.referenceDependency
          ? { ...field.referenceDependency }
          : null,
      })),
      relationNames: template
        .filter((field) => field.isReference)
        .map((field) => field.name),
      requiredFieldNames: template
        .filter((field) => field.isRequired)
        .map((field) => field.name),
      filterOperators: [
        '$eq',
        '$ne',
        '$in',
        '$nin',
        '$gt',
        '$gte',
        '$lt',
        '$lte',
        '$ilike',
        '$like',
        '$or',
        '$and',
      ],
      usageHints: [...SAPLING_MCP_USAGE_HINTS.entitySchema],
    };
  }

  private executeEntitySearch(
    args: Record<string, unknown>,
    policy?: McpToolPolicy,
  ): {
    query: string;
    matches: Array<{
      entityHandle: string;
      score: number;
      matchedOn: string[];
      relationNames: string[];
      requiredFieldNames: string[];
      fieldPreview: string[];
    }>;
    usageHints: string[];
  } {
    const query = this.requireStringArg(args.query, 'query');
    const normalizedQuery = query.toLowerCase();
    const limit = Math.min(this.asPositiveNumber(args.limit) ?? 10, 50);

    const matches = this.filterPolicyEntityHandles([...ENTITY_HANDLES], policy)
      .map((entityHandle) => {
        const template = this.getEntityTemplate(entityHandle);
        const matchedOn = new Set<string>();
        let score = 0;

        score += this.scoreSearchValue(
          normalizedQuery,
          entityHandle,
          'entityHandle',
          matchedOn,
          120,
          90,
          60,
        );

        for (const field of template) {
          score += this.scoreSearchValue(
            normalizedQuery,
            field.name,
            `field:${field.name}`,
            matchedOn,
            50,
            35,
            20,
          );

          if (field.referenceName) {
            score += this.scoreSearchValue(
              normalizedQuery,
              field.referenceName,
              `reference:${field.referenceName}`,
              matchedOn,
              24,
              18,
              12,
            );
          }
        }

        if (score === 0) {
          return null;
        }

        return {
          entityHandle,
          score,
          matchedOn: [...matchedOn],
          relationNames: template
            .filter((field) => field.isReference)
            .map((field) => field.name),
          requiredFieldNames: template
            .filter((field) => field.isRequired)
            .map((field) => field.name),
          fieldPreview: template.slice(0, 12).map((field) => field.name),
        };
      })
      .filter(
        (
          item,
        ): item is {
          entityHandle: string;
          score: number;
          matchedOn: string[];
          relationNames: string[];
          requiredFieldNames: string[];
          fieldPreview: string[];
        } => item != null,
      )
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.entityHandle.localeCompare(right.entityHandle),
      )
      .slice(0, limit);

    return {
      query,
      matches,
      usageHints: [...SAPLING_MCP_USAGE_HINTS.entitySearch],
    };
  }

  private createToolErrorPayload(toolName: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      toolName,
      error: message,
      hints: [...SAPLING_MCP_USAGE_HINTS.toolError],
    };
  }

  private asEntityRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asCollectionRecords(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object',
      );
    }

    if (
      value &&
      typeof value === 'object' &&
      'getItems' in (value as Record<string, unknown>)
    ) {
      const items = (value as { getItems: () => unknown[] }).getItems();
      return items.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object',
      );
    }

    return [];
  }

  private asPrimitive(value: unknown): string | number | boolean | null {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    return null;
  }

  private scoreSearchValue(
    normalizedQuery: string,
    candidate: string | null | undefined,
    label: string,
    matchedOn: Set<string>,
    exactScore: number,
    prefixScore: number,
    includeScore: number,
  ): number {
    if (!candidate) {
      return 0;
    }

    const normalizedCandidate = candidate.toLowerCase();

    if (normalizedCandidate === normalizedQuery) {
      matchedOn.add(label);
      return exactScore;
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
      matchedOn.add(label);
      return prefixScore;
    }

    if (normalizedCandidate.includes(normalizedQuery)) {
      matchedOn.add(label);
      return includeScore;
    }

    return 0;
  }

  private async executeGenericGet(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowRead',
    );
    const handle = this.requireHandleArg(args.handle, 'handle');
    const relations = this.normalizeEntityRelations(
      entityHandle,
      this.asStringArray(args.relations),
    );
    const result = await this.genericService.findAndCount(
      entityHandle,
      { handle },
      1,
      1,
      {},
      user,
      relations,
    );
    const record = Array.isArray((result as { data?: unknown[] }).data)
      ? ((result as { data: unknown[] }).data[0] ?? null)
      : null;
    const resolvedHandle =
      record && typeof record === 'object'
        ? this.asPrimitive((record as { handle?: unknown }).handle)
        : null;

    return {
      entityHandle,
      ...(resolvedHandle !== null ? { handle: resolvedHandle } : {}),
      found: record != null,
      record,
      usageHints: [...SAPLING_MCP_USAGE_HINTS.genericGet],
    };
  }

  private async executeGenericTimeline(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowRead',
    );
    const handle = this.requireHandleArg(args.handle, 'handle');
    const before =
      typeof args.before === 'string' && args.before.trim()
        ? args.before.trim()
        : undefined;
    const months = Math.min(this.asPositiveNumber(args.months) ?? 6, 12);

    return this.genericService.getRecordTimeline(
      entityHandle,
      handle,
      user,
      before,
      months,
    );
  }

  private async executeTicketSearch(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    this.assertEntityAllowed('ticket', policy);
    await this.permissionService.assertEntityPermission(
      user,
      'ticket',
      'allowRead',
    );
    const query = this.requireStringArg(args.query, 'query');
    const searchMode = this.asTicketSearchMode(args.searchMode);
    const limit = Math.min(this.asPositiveNumber(args.limit) ?? 10, 50);
    const searchFields = this.getTicketSearchFields(searchMode);
    const filter = {
      $or: searchFields.map((field) => ({
        [field]: { $ilike: `%${query}%` },
      })),
    };

    const result = await this.genericService.findAndCount(
      'ticket',
      filter,
      1,
      limit,
      {},
      user,
      [],
    );

    return {
      entityHandle: 'ticket',
      query,
      searchMode,
      searchFields,
      appliedFilter: filter,
      ...result,
      usageHints: [...SAPLING_MCP_USAGE_HINTS.ticketSearch],
    };
  }

  private async executeSemanticSearch(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowRead',
    );
    const query = this.requireStringArg(args.query, 'query');
    const limit = Math.min(this.asPositiveNumber(args.limit) ?? 5, 20);
    const result = await this.aiService.searchVectorDocuments(
      entityHandle,
      query,
      user,
      limit,
    );

    return {
      ...result,
      usageHints: [...SAPLING_MCP_USAGE_HINTS.semanticSearch],
    };
  }

  private async executeKnowledgeSearch(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const query = this.requireStringArg(args.query, 'query');
    const limit = Math.min(this.asPositiveNumber(args.limit) ?? 8, 30);
    const requestedEntityHandles = this.asStringArray(args.entityHandles);
    const entityHandles = this.normalizeKnowledgeSearchEntityHandles(
      requestedEntityHandles,
      policy,
    );
    const perEntityLimit = Math.min(Math.max(limit, 5), 20);
    const skippedEntityHandles: string[] = [];
    const unindexedEntityHandles: string[] = [];
    const indexedEntityHandles: string[] = [];
    const sourceResults: unknown[] = [];
    const errors: Array<{ entityHandle: string; error: string }> = [];
    const combinedResults: Array<{
      entityHandle: string;
      handle: string | number | null;
      score: number;
      record: unknown;
      matches: unknown[];
    }> = [];

    for (const entityHandle of entityHandles) {
      try {
        await this.permissionService.assertEntityPermission(
          user,
          entityHandle,
          'allowRead',
        );
      } catch {
        skippedEntityHandles.push(entityHandle);
        continue;
      }

      try {
        const result = await this.aiService.searchVectorDocuments(
          entityHandle,
          query,
          user,
          perEntityLimit,
        );
        const resultRecord = this.asRecord(result);
        sourceResults.push(result);

        if (resultRecord.indexed === false) {
          unindexedEntityHandles.push(entityHandle);
          continue;
        }

        indexedEntityHandles.push(entityHandle);
        const results = Array.isArray(resultRecord.results)
          ? resultRecord.results
          : [];

        for (const item of results) {
          const itemRecord = this.asRecord(item);

          if (!itemRecord) {
            continue;
          }

          combinedResults.push({
            entityHandle,
            handle: this.asResultHandle(itemRecord.handle),
            score: this.asScore(itemRecord.score),
            record: itemRecord.record ?? null,
            matches: Array.isArray(itemRecord.matches)
              ? itemRecord.matches
              : [],
          });
        }
      } catch (error) {
        errors.push({
          entityHandle,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      query,
      entityHandles,
      indexedEntityHandles,
      unindexedEntityHandles,
      skippedEntityHandles,
      results: combinedResults
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.entityHandle.localeCompare(right.entityHandle),
        )
        .slice(0, limit),
      sourceResults,
      errors,
      usageHints: [...SAPLING_MCP_USAGE_HINTS.knowledgeSearch],
    };
  }

  private async executeImportGetBatch(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    await this.assertImportAdministrator(user);
    const batchHandle = this.requirePositiveIntArg(
      args.batchHandle,
      'batchHandle',
    );
    const batch = await this.importService.getBatch(batchHandle);

    if (batch.entityHandle) {
      this.assertEntityAllowed(batch.entityHandle, policy);
    }

    return batch;
  }

  private async executeImportListTemplates(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    await this.assertImportAdministrator(user);
    const entityHandle = this.asStringValue(args.entityHandle);

    if (entityHandle) {
      this.assertEntityAllowed(entityHandle, policy);
      await this.permissionService.assertEntityPermission(
        user,
        entityHandle,
        'allowRead',
      );
    }

    return this.importService.listTemplates(
      entityHandle ?? undefined,
      this.asStringValue(args.sourceHandle) ?? undefined,
    );
  }

  private async executeImportSuggestMapping(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    await this.assertImportAdministrator(user);
    const batchHandle = this.requirePositiveIntArg(
      args.batchHandle,
      'batchHandle',
    );
    const batch = await this.importService.getBatch(batchHandle);
    const entityHandle =
      this.asStringValue(args.entityHandle) ?? batch.entityHandle;

    if (entityHandle) {
      this.assertEntityAllowed(entityHandle, policy);
      await this.permissionService.assertEntityPermission(
        user,
        entityHandle,
        'allowRead',
      );
    }

    const dto: ImportAiSuggestDto = {
      entityHandle,
      sourceHandle: this.asStringValue(args.sourceHandle),
      maxSampleRows: this.asPositiveNumber(args.maxSampleRows),
    };

    return this.importService.suggestBatchConfiguration(batchHandle, dto);
  }

  private async executeImportConfigureBatch(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    await this.assertImportAdministrator(user);
    const batchHandle = this.requirePositiveIntArg(
      args.batchHandle,
      'batchHandle',
    );
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowInsert',
    );
    const sourceHandle = this.asStringValue(args.sourceHandle);
    const batch = await this.importService.getBatch(batchHandle);

    const dto: ConfigureImportBatchDto = {
      entityHandle,
      sourceHandle,
      templateHandle: this.asPositiveNumber(args.templateHandle),
      keyColumns: sourceHandle ? this.asStringArray(args.keyColumns) : [],
      mappings: this.withImplicitHandleMapping(
        this.asFieldMappingArray(args.mappings),
        batch.headers,
      ) as ConfigureImportBatchDto['mappings'],
      relationMappings: this.asRecordArray(
        args.relationMappings,
      ) as ConfigureImportBatchDto['relationMappings'],
      valueMappings: this.asRecordArray(
        args.valueMappings,
      ) as ConfigureImportBatchDto['valueMappings'],
      genericReferenceMapping:
        Object.keys(this.asRecord(args.genericReferenceMapping)).length > 0
          ? (this.asRecord(
              args.genericReferenceMapping,
            ) as ConfigureImportBatchDto['genericReferenceMapping'])
          : null,
    };

    return this.importService.configureBatch(batchHandle, dto, user);
  }

  private async executeImportExecuteBatch(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    await this.assertImportAdministrator(user);
    const batchHandle = this.requirePositiveIntArg(
      args.batchHandle,
      'batchHandle',
    );
    const batch = await this.importService.getBatch(batchHandle);

    if (batch.entityHandle) {
      this.assertEntityAllowed(batch.entityHandle, policy);
      await this.permissionService.assertEntityPermission(
        user,
        batch.entityHandle,
        'allowInsert',
      );
    }

    return this.importService.executeBatch(batchHandle, user);
  }

  private async executeImportMatchExistingRecords(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    await this.assertImportAdministrator(user);
    const batchHandle = this.requirePositiveIntArg(
      args.batchHandle,
      'batchHandle',
    );
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowRead',
    );

    const batch = await this.importService.getBatch(batchHandle);
    const sourceColumns = this.resolveImportMatchSourceColumns(
      batch,
      this.asStringArray(args.sourceColumns),
    );
    const targetFields = this.resolveImportMatchTargetFields(
      entityHandle,
      this.asStringArray(args.targetFields),
    );

    if (targetFields.length === 0) {
      throw new ForbiddenException('ai.importNoSearchableFields');
    }
    const sampleLimit = Math.min(
      this.asPositiveNumber(args.sampleLimit) ?? 10,
      50,
    );
    const limitPerValue = Math.min(
      this.asPositiveNumber(args.limitPerValue) ?? 3,
      10,
    );
    const rows = batch.rows.length > 0 ? batch.rows : [];
    const sampledRows = rows.slice(0, sampleLimit);
    const matches: unknown[] = [];
    let checkedValues = 0;

    for (const row of sampledRows) {
      for (const sourceColumn of sourceColumns) {
        const rawValue = row.rawData?.[sourceColumn];
        const value = this.formatDisplayValuePart(rawValue);

        if (!value || value.length < 2) {
          continue;
        }

        checkedValues += 1;
        const filter = {
          $or: targetFields.map((targetField) => ({
            [targetField]: { $ilike: `%${value}%` },
          })),
        };

        try {
          const result = await this.genericService.findAndCount(
            entityHandle,
            filter,
            1,
            limitPerValue,
            {},
            user,
            [],
          );

          if (result.data.length > 0) {
            matches.push({
              rowNumber: row.rowNumber,
              sourceColumn,
              value,
              total: result.meta.total,
              records: result.data.map((record) => ({
                displayValue: this.buildRecordDisplayValue(
                  entityHandle,
                  record as Record<string, unknown>,
                ),
                record: this.sanitizeEntityRecord(entityHandle, record),
              })),
            });
          }
        } catch (error) {
          matches.push({
            rowNumber: row.rowNumber,
            sourceColumn,
            value,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {
      batchHandle,
      entityHandle,
      sourceColumns,
      targetFields,
      sampledRows: sampledRows.length,
      checkedValues,
      matchCount: matches.length,
      matches,
    };
  }

  private normalizeKnowledgeSearchEntityHandles(
    requestedEntityHandles: string[],
    policy?: McpToolPolicy,
  ): string[] {
    const requested = requestedEntityHandles
      .map((handle) => handle.trim())
      .filter(Boolean);
    const candidates =
      requested.length > 0
        ? requested
        : this.defaultKnowledgeSearchEntityHandles;
    const defaultAllowed = new Set(this.defaultKnowledgeSearchEntityHandles);
    const policyKnowledgeHandles = this.normalizeStringList(
      policy?.allowedKnowledgeEntityHandles,
    );
    const policyEntityHandles = this.normalizeStringList(
      policy?.allowedEntityHandles,
    );
    const policyAllowedHandles =
      policyKnowledgeHandles.length > 0
        ? new Set(policyKnowledgeHandles)
        : policyEntityHandles.length > 0
          ? new Set(policyEntityHandles)
          : null;
    const normalized: string[] = [];

    for (const entityHandle of candidates) {
      const normalizedEntityHandle = entityHandle.toLowerCase();
      if (
        !defaultAllowed.has(entityHandle) ||
        (policyAllowedHandles &&
          !policyAllowedHandles.has(normalizedEntityHandle)) ||
        normalized.includes(entityHandle)
      ) {
        continue;
      }

      normalized.push(entityHandle);
    }

    return normalized.length > 0
      ? normalized
      : [...this.defaultKnowledgeSearchEntityHandles];
  }

  private asResultHandle(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return null;
  }

  private asScore(value: unknown): number {
    const score = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(score) ? score : 0;
  }

  private asTicketSearchMode(value: unknown): 'all' | 'problem' | 'solution' {
    return value === 'problem' || value === 'solution' ? value : 'all';
  }

  private getTicketSearchFields(
    searchMode: 'all' | 'problem' | 'solution',
  ): string[] {
    switch (searchMode) {
      case 'problem':
        return ['number', 'externalNumber', 'title', 'problemDescription'];
      case 'solution':
        return ['number', 'externalNumber', 'title', 'solutionDescription'];
      default:
        return [
          'number',
          'externalNumber',
          'title',
          'problemDescription',
          'solutionDescription',
        ];
    }
  }

  private normalizeEntityCriteria(
    entityHandle: string,
    criteria: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.normalizeCriteriaValue(
      entityHandle,
      criteria,
      'filter',
    ) as Record<string, unknown>;
  }

  private normalizeEntitySort(
    entityHandle: string,
    orderBy: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.normalizeCriteriaValue(
      entityHandle,
      orderBy,
      'orderBy',
    ) as Record<string, unknown>;
  }

  private normalizeEntityRelations(
    entityHandle: string,
    relations: string[],
  ): string[] {
    if (relations.length === 0) {
      return [];
    }

    const relationNames = new Set(
      this.getEntityTemplate(entityHandle)
        .filter((field) => field.isReference)
        .map((field) => field.name),
    );

    return relations.filter((relation) => relationNames.has(relation));
  }

  private normalizeCriteriaValue(
    entityHandle: string,
    value: unknown,
    mode: 'filter' | 'orderBy',
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.normalizeCriteriaValue(entityHandle, item, mode),
      );
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const record = value as Record<string, unknown>;
    const normalizedRecord: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(record)) {
      const normalizedKey = this.normalizeOperatorKey(rawKey);

      if (normalizedKey === '$or' || normalizedKey === '$and') {
        normalizedRecord[normalizedKey] = Array.isArray(rawValue)
          ? rawValue.map((item) =>
              this.normalizeCriteriaValue(entityHandle, item, mode),
            )
          : [];
        continue;
      }

      if (this.isOperatorKey(normalizedKey)) {
        normalizedRecord[normalizedKey] = this.normalizeCriteriaValue(
          entityHandle,
          rawValue,
          mode,
        );
        continue;
      }

      if (normalizedKey.includes('.')) {
        this.mergeNormalizedRecord(
          normalizedRecord,
          this.normalizeDottedCriteria(
            entityHandle,
            normalizedKey,
            rawValue,
            mode,
          ),
        );
        continue;
      }

      const field = this.getEntityField(entityHandle, normalizedKey);

      if (!field) {
        throw new ForbiddenException(
          `Invalid ${mode} field "${normalizedKey}" for entity "${entityHandle}". Use entity_schema first.`,
        );
      }

      if (mode === 'orderBy' && typeof rawValue === 'string') {
        normalizedRecord[normalizedKey] = rawValue;
        continue;
      }

      if (
        field.isReference &&
        field.referenceName &&
        rawValue &&
        typeof rawValue === 'object' &&
        !Array.isArray(rawValue)
      ) {
        const relationRecord = rawValue as Record<string, unknown>;
        const relationKeys = Object.keys(relationRecord).map((key) =>
          this.normalizeOperatorKey(key),
        );
        const containsOnlyOperators =
          relationKeys.length > 0 &&
          relationKeys.every((key) => this.isOperatorKey(key));

        normalizedRecord[normalizedKey] = containsOnlyOperators
          ? this.normalizeCriteriaValue(entityHandle, relationRecord, mode)
          : this.normalizeCriteriaValue(
              field.referenceName,
              relationRecord,
              mode,
            );
        continue;
      }

      normalizedRecord[normalizedKey] = this.normalizeCriteriaValue(
        entityHandle,
        rawValue,
        mode,
      );
    }

    return normalizedRecord;
  }

  private normalizeDottedCriteria(
    entityHandle: string,
    dottedKey: string,
    rawValue: unknown,
    mode: 'filter' | 'orderBy',
  ): Record<string, unknown> {
    const [head, ...rest] = dottedKey
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!head || rest.length === 0) {
      throw new ForbiddenException(
        `Invalid ${mode} field "${dottedKey}" for entity "${entityHandle}". Use entity_schema first.`,
      );
    }

    const field = this.getEntityField(entityHandle, head);

    if (!field || !field.isReference || !field.referenceName) {
      throw new ForbiddenException(
        `Invalid ${mode} field "${dottedKey}" for entity "${entityHandle}". Use entity_schema first.`,
      );
    }

    return {
      [head]: this.normalizeCriteriaValue(
        field.referenceName,
        { [rest.join('.')]: rawValue },
        mode,
      ),
    };
  }

  private mergeNormalizedRecord(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(source)) {
      const existingValue = target[key];

      if (
        existingValue &&
        typeof existingValue === 'object' &&
        !Array.isArray(existingValue) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.mergeNormalizedRecord(
          existingValue as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }

      target[key] = value;
    }
  }

  private normalizeOperatorKey(key: string): string {
    const normalized = key.trim();

    switch (normalized) {
      case 'eq':
        return '$eq';
      case 'ne':
        return '$ne';
      case 'gt':
        return '$gt';
      case 'gte':
        return '$gte';
      case 'lt':
        return '$lt';
      case 'lte':
        return '$lte';
      case 'in':
        return '$in';
      case 'nin':
        return '$nin';
      case 'like':
        return '$like';
      case 'ilike':
        return '$ilike';
      case 'or':
        return '$or';
      case 'and':
        return '$and';
      default:
        return normalized;
    }
  }

  private isOperatorKey(key: string): boolean {
    return [
      '$eq',
      '$ne',
      '$gt',
      '$gte',
      '$lt',
      '$lte',
      '$in',
      '$nin',
      '$like',
      '$ilike',
      '$or',
      '$and',
    ].includes(key);
  }

  private getEntityField(
    entityHandle: string,
    fieldName: string,
  ): EntityTemplateDto | null {
    return (
      this.getEntityTemplate(entityHandle).find(
        (field) => field.name === fieldName,
      ) ?? null
    );
  }

  private getEntityTemplate(entityHandle: string): EntityTemplateDto[] {
    return this.getRawEntityTemplate(entityHandle).filter(
      (field) => !field.options?.includes('isSecurity'),
    );
  }

  private getRawEntityTemplate(entityHandle: string): EntityTemplateDto[] {
    return this.templateService.getEntityTemplate(entityHandle);
  }

  private stripSecurityFields(
    entityHandle: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitizedData: Record<string, unknown> = {};
    const template = this.getRawEntityTemplate(entityHandle);

    for (const [key, value] of Object.entries(data)) {
      const field = template.find((entry) => entry.name === key);

      if (field?.options?.includes('isSecurity')) {
        continue;
      }

      if (field?.isReference && field.referenceName) {
        sanitizedData[key] = this.stripSecurityValue(
          field.referenceName,
          value,
        );
        continue;
      }

      sanitizedData[key] = value;
    }

    return sanitizedData;
  }

  private stripSecurityValue(entityHandle: string, value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripSecurityValue(entityHandle, item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return this.stripSecurityFields(
      entityHandle,
      value as Record<string, unknown>,
    );
  }

  private async executeGenericCreate(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowInsert',
    );
    const data = this.stripSecurityFields(
      entityHandle,
      this.asRecord(args.data),
    );
    return this.genericService.create(entityHandle, data, user);
  }

  private async executeGenericUpdate(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowUpdate',
    );
    const handle = this.requireHandleArg(args.handle, 'handle');
    const data = this.stripSecurityFields(
      entityHandle,
      this.asRecord(args.data),
    );
    const relations = this.asStringArray(args.relations);

    return this.genericService.update(
      entityHandle,
      handle,
      data,
      user,
      relations,
    );
  }

  private async executeGenericDelete(
    args: Record<string, unknown>,
    user: PersonItem,
    policy?: McpToolPolicy,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
    this.assertEntityAllowed(entityHandle, policy);
    await this.permissionService.assertEntityPermission(
      user,
      entityHandle,
      'allowDelete',
    );
    const handle = this.requireHandleArg(args.handle, 'handle');

    await this.genericService.delete(entityHandle, handle, user);

    return {
      success: true,
      entityHandle,
      handle,
    };
  }

  private async assertImportAdministrator(user: PersonItem): Promise<void> {
    const person = await this.currentService.getPerson(user);
    const rolesSource = person?.roles as
      | Array<{ isAdministrator?: boolean }>
      | { getItems?: () => Array<{ isAdministrator?: boolean }> }
      | undefined;
    const roles = Array.isArray(rolesSource)
      ? rolesSource
      : (rolesSource?.getItems?.() ?? []);

    if (!roles.some((role) => role.isAdministrator === true)) {
      throw new ForbiddenException('global.permissionDenied');
    }
  }

  private resolveImportMatchSourceColumns(
    batch: { headers: string[]; mapping?: object | null },
    requestedColumns: string[],
  ): string[] {
    const headerSet = new Set(batch.headers);
    const requested = requestedColumns.filter((column) =>
      headerSet.has(column),
    );

    if (requested.length > 0) {
      return requested;
    }

    const mapping = this.asRecord(batch.mapping);
    const mappedColumns = Array.isArray(mapping.mappings)
      ? mapping.mappings
          .map((entry) => this.asStringValue(this.asRecord(entry).sourceColumn))
          .filter(
            (column): column is string => !!column && headerSet.has(column),
          )
      : [];

    return mappedColumns.length > 0
      ? [...new Set(mappedColumns)]
      : batch.headers;
  }

  private resolveImportMatchTargetFields(
    entityHandle: string,
    requestedFields: string[],
  ): string[] {
    const fields = this.getEntityTemplate(entityHandle).filter(
      (field) =>
        !field.isReference &&
        !field.isPrimaryKey &&
        field.type === 'string' &&
        !field.options?.includes('isSecurity'),
    );
    const fieldNames = new Set(fields.map((field) => field.name));
    const requested = requestedFields.filter((field) => fieldNames.has(field));

    if (requested.length > 0) {
      return requested;
    }

    const preferredFields = [
      'number',
      'externalNumber',
      'title',
      'name',
      'firstName',
      'lastName',
      'email',
      'subject',
      'description',
    ].filter((field) => fieldNames.has(field));

    if (preferredFields.length > 0) {
      return preferredFields;
    }

    return fields
      .filter((field) => field.options?.includes('isValue'))
      .map((field) => field.name)
      .slice(0, 5);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asRecordArray(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
      ? value
          .map((item) => this.asRecord(item))
          .filter((item) => Object.keys(item).length > 0)
      : [];
  }

  private asFieldMappingArray(value: unknown): Record<string, unknown>[] {
    const arrayValue = this.asRecordArray(value);

    if (arrayValue.length > 0) {
      return arrayValue;
    }

    const recordValue = this.asRecord(value);

    const mappings: Record<string, unknown>[] = [];

    for (const [left, right] of Object.entries(recordValue)) {
      if (typeof right !== 'string' || !right.trim()) {
        continue;
      }

      const sourceColumn = left.trim();
      const targetField = right.trim();

      if (!sourceColumn || !targetField) {
        continue;
      }

      mappings.push({ sourceColumn, targetField });
    }

    return mappings;
  }

  private withImplicitHandleMapping(
    mappings: Record<string, unknown>[],
    headers: unknown,
  ): Record<string, unknown>[] {
    const headerNames = this.asStringArray(headers);
    const hasHandleHeader = headerNames.some(
      (header) => header.trim().toLowerCase() === 'handle',
    );

    if (!hasHandleHeader) {
      return mappings;
    }

    const hasHandleMapping = mappings.some((mapping) => {
      const sourceColumn = this.asStringValue(mapping.sourceColumn);
      const targetField = this.asStringValue(mapping.targetField);
      return (
        sourceColumn?.toLowerCase() === 'handle' ||
        targetField?.toLowerCase() === 'handle'
      );
    });

    return hasHandleMapping
      ? mappings
      : [{ sourceColumn: 'handle', targetField: 'handle' }, ...mappings];
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private assertInternalToolAllowed(
    toolName: string,
    policy?: McpToolPolicy,
  ): void {
    if (this.matchesAllowList(policy?.allowedInternalTools, toolName)) {
      return;
    }

    throw new ForbiddenException('ai.agentToolNotAllowed');
  }

  private assertEntityAllowed(
    entityHandle: string,
    policy?: McpToolPolicy,
  ): void {
    if (this.isEntityAllowed(entityHandle, policy)) {
      return;
    }

    throw new ForbiddenException(`ai.agentEntityNotAllowed:${entityHandle}`);
  }

  private isEntityAllowed(
    entityHandle: string,
    policy?: McpToolPolicy,
  ): boolean {
    return this.matchesAllowList(policy?.allowedEntityHandles, entityHandle);
  }

  private filterPolicyEntityHandles(
    entityHandles: string[],
    policy?: McpToolPolicy,
  ): string[] {
    return entityHandles.filter((entityHandle) =>
      this.isEntityAllowed(entityHandle, policy),
    );
  }

  private matchesAllowList(
    allowList: string[] | null | undefined,
    candidate: string,
  ): boolean {
    const normalizedAllowList = this.normalizeStringList(allowList);

    if (normalizedAllowList.length === 0) {
      return true;
    }

    return normalizedAllowList.includes(candidate.trim().toLowerCase());
  }

  private normalizeStringList(value: string[] | null | undefined): string[] {
    return (value ?? [])
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  private asPositiveNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.trunc(value)
      : null;
  }

  private requireStringArg(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new ForbiddenException(`ai.mcp${fieldName}Missing`);
    }

    return value.trim();
  }

  private requireHandleArg(value: unknown, fieldName: string): string | number {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    throw new ForbiddenException(`ai.mcp${fieldName}Missing`);
  }

  private requirePositiveIntArg(value: unknown, fieldName: string): number {
    const normalized = this.asPositiveNumber(value);

    if (normalized == null) {
      throw new ForbiddenException(`ai.mcp${fieldName}Missing`);
    }

    return normalized;
  }

  private handleTransportError(error: unknown, res: Response) {
    if (res.headersSent) {
      return;
    }

    if (error instanceof ForbiddenException) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: error.message,
        },
        id: null,
      });
      return;
    }

    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }

  private readSessionId(req: Request): string | undefined {
    const sessionId = req.header('mcp-session-id') ?? undefined;
    return sessionId?.trim() || undefined;
  }

  private requireOwnedSession(
    sessionId: string | undefined,
    user: PersonItem,
  ): SaplingMcpSession {
    if (!sessionId) {
      throw new ForbiddenException('ai.mcpSessionMissing');
    }

    const session = this.transports.get(sessionId);

    if (!session) {
      throw new ForbiddenException('ai.mcpSessionMissing');
    }

    if (session.userHandle !== this.requireUserHandle(user)) {
      throw new ForbiddenException('global.permissionDenied');
    }

    return session;
  }

  private requireUserHandle(user: PersonItem): number {
    if (user.handle == null) {
      throw new ForbiddenException('auth.userNotFound');
    }

    return user.handle;
  }
}
