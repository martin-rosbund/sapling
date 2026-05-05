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
import { PersonItem } from '../../entity/PersonItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { AiService } from './ai.service';
import { SAPLING_MCP_TOOL_DEFINITIONS } from './sapling-mcp-tool-definitions';
import { SAPLING_MCP_USAGE_HINTS } from './prompts/sapling-mcp.prompts';
import { SaplingMcpPermissionService } from './sapling-mcp-permission.service';

type SaplingMcpSession = {
  transport: StreamableHTTPServerTransport;
  userHandle: number;
};

@Injectable()
export class SaplingMcpService {
  private readonly transports = new Map<string, SaplingMcpSession>();
  private readonly internalServerName = 'sapling';

  constructor(
    private readonly genericService: GenericService,
    private readonly currentService: CurrentService,
    private readonly templateService: TemplateService,
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
  ): Promise<{ content: string; rawResult: unknown }> {
    let payload: unknown;

    try {
      switch (toolName) {
        case 'current_person':
          payload = await this.executeCurrentPerson(user);
          break;
        case 'entity_catalog':
          payload = this.executeEntityCatalog();
          break;
        case 'entity_schema':
          payload = this.executeEntitySchema(args);
          break;
        case 'entity_search':
          payload = this.executeEntitySearch(args);
          break;
        case 'generic_list':
          payload = await this.executeGenericList(args, user);
          break;
        case 'generic_get':
          payload = await this.executeGenericGet(args, user);
          break;
        case 'generic_timeline':
          payload = await this.executeGenericTimeline(args, user);
          break;
        case 'ticket_search':
          payload = await this.executeTicketSearch(args, user);
          break;
        case 'semantic_search':
          payload = await this.executeSemanticSearch(args, user);
          break;
        case 'generic_create':
          payload = await this.executeGenericCreate(args, user);
          break;
        case 'generic_update':
          payload = await this.executeGenericUpdate(args, user);
          break;
        case 'generic_delete':
          payload = await this.executeGenericDelete(args, user);
          break;
        default:
          throw new ForbiddenException('ai.mcpToolNotFound');
      }
    } catch (error) {
      payload = this.createToolErrorPayload(toolName, error);
    }

    return {
      content: JSON.stringify(payload, null, 2),
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
          return this.createJsonContent(result.rawResult);
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

  private async executeGenericList(
    args: Record<string, unknown>,
    user: PersonItem,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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

  private executeEntityCatalog(): { entities: string[] } {
    return {
      entities: [...ENTITY_HANDLES].sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }

  private executeEntitySchema(args: Record<string, unknown>): {
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

  private executeEntitySearch(args: Record<string, unknown>): {
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

    const matches = [...ENTITY_HANDLES]
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
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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
  ): Promise<unknown> {
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
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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
      ...(result as Record<string, unknown>),
      usageHints: [...SAPLING_MCP_USAGE_HINTS.semanticSearch],
    };
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
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(
      args.entityHandle,
      'entityHandle',
    );
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

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
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
