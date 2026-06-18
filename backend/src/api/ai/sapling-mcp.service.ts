import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
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
  ImportMatchRequestDto,
} from '../import/import.types';
import { PersonItem } from '../../entity/PersonItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { AiService } from './ai.service';
import { SAPLING_MCP_TOOL_DEFINITIONS } from './sapling-mcp-tool-definitions';
import { SAPLING_MCP_USAGE_HINTS } from './prompts/sapling-mcp.prompts';
import { SaplingMcpPermissionService } from './sapling-mcp-permission.service';
import type { McpToolPolicy } from './mcp-policy.types';
import { SaplingMcpCriteriaRepairRequest } from './sapling-mcp-criteria.types';
import { SaplingMcpCriteriaService } from './sapling-mcp-criteria.service';
import { SaplingMcpResultFormatterService } from './sapling-mcp-result-formatter.service';

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
    private readonly criteriaService: SaplingMcpCriteriaService,
    private readonly permissionService: SaplingMcpPermissionService,
    private readonly resultFormatter: SaplingMcpResultFormatterService,
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

    const modelResult = this.resultFormatter.createModelResult(
      toolName,
      payload,
      args,
    );

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
    let filter: Record<string, unknown>;
    let orderBy: Record<string, unknown>;

    try {
      filter = this.criteriaService.normalizeEntityCriteria(
        entityHandle,
        this.asRecord(args.filter),
      );
      orderBy = this.criteriaService.normalizeEntitySort(
        entityHandle,
        this.asRecord(args.orderBy),
      );
    } catch (error) {
      if (error instanceof SaplingMcpCriteriaRepairRequest) {
        return this.criteriaService.createCriteriaRepairResult(
          entityHandle,
          error,
        );
      }

      throw error;
    }

    const relations = this.criteriaService.normalizeEntityRelations(
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
      filterOperators: this.criteriaService.getFilterOperators(),
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
    const relations = this.criteriaService.normalizeEntityRelations(
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

    const matchRequest: ImportMatchRequestDto = {
      entityHandle,
      sourceColumns,
      targetFields,
      sampleLimit: this.asPositiveNumber(args.sampleLimit) ?? 10,
      limitPerValue: this.asPositiveNumber(args.limitPerValue) ?? 3,
    };

    return this.importService.matchBatchExistingRecords(
      batchHandle,
      matchRequest,
      user,
    );
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

  private async applyRequiredCurrentReferenceDefaults(
    entityHandle: string,
    data: Record<string, unknown>,
    user: PersonItem,
  ): Promise<Record<string, unknown>> {
    const template = this.getEntityTemplate(entityHandle);
    const fields = template.filter(
      (field) =>
        field.isRequired &&
        field.isReference &&
        (field.options?.includes('isCurrentCompany') ||
          field.options?.includes('isCurrentPerson')),
    );

    if (fields.length === 0) {
      return data;
    }

    const defaultedData = { ...data };
    let currentPersonRecord: Record<string, unknown> | null | undefined;

    for (const field of fields) {
      if (this.hasReferencePayloadValue(field, defaultedData[field.name])) {
        continue;
      }

      if (field.options?.includes('isCurrentPerson')) {
        const currentPersonHandle =
          this.asResultHandle(user.handle) ??
          this.asResultHandle(
            (currentPersonRecord ??=
              await this.resolveCurrentPersonRecord(user)).handle,
          );

        if (currentPersonHandle == null) {
          throw new BadRequestException('ai.mcpCurrentPersonMissing');
        }

        defaultedData[field.name] = currentPersonHandle;
        continue;
      }

      if (field.options?.includes('isCurrentCompany')) {
        currentPersonRecord ??= await this.resolveCurrentPersonRecord(user);
        const companyHandle =
          this.asResultHandle(currentPersonRecord?.company) ??
          this.asResultHandle(
            this.asEntityRecord(currentPersonRecord?.company)?.handle,
          );

        if (companyHandle == null) {
          throw new BadRequestException('ai.mcpCurrentCompanyMissing');
        }

        defaultedData[field.name] = companyHandle;
      }
    }

    return defaultedData;
  }

  private async resolveCurrentPersonRecord(
    user: PersonItem,
  ): Promise<Record<string, unknown>> {
    const currentPerson = (await this.currentService.getPerson(user)) ?? user;
    return this.asEntityRecord(currentPerson) ?? {};
  }

  private hasReferencePayloadValue(
    field: EntityTemplateDto,
    value: unknown,
  ): boolean {
    if (this.asResultHandle(value) != null) {
      return true;
    }

    if (Array.isArray(value) || !value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    const referencedPks =
      field.referencedPks.length > 0 ? field.referencedPks : ['handle'];

    return referencedPks.every(
      (referencedPk) => this.asResultHandle(record[referencedPk]) != null,
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
    const defaultedData = await this.applyRequiredCurrentReferenceDefaults(
      entityHandle,
      data,
      user,
    );
    return this.genericService.create(entityHandle, defaultedData, user);
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
