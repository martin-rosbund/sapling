import { randomUUID } from 'node:crypto';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';
import type { Request, Response } from 'express';
import { GenericService } from '../generic/generic.service';
import { PersonItem } from '../../entity/PersonItem';

type SaplingMcpSession = {
  transport: StreamableHTTPServerTransport;
  userHandle: number;
};

@Injectable()
export class SaplingMcpService {
  private readonly transports = new Map<string, SaplingMcpSession>();
  private readonly internalServerName = 'sapling';
  private readonly toolDefinitions = [
    {
      toolName: 'generic_list',
      description:
        'List Sapling generic records with the same read permissions and filters as the current user.',
      inputSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          filter: {
            type: 'object',
            description: 'Optional MikroORM filter object.',
            additionalProperties: true,
          },
          orderBy: {
            type: 'object',
            description: 'Optional orderBy object.',
            additionalProperties: true,
          },
          relations: {
            type: 'array',
            description: 'Optional relations to populate.',
            items: { type: 'string' },
          },
          page: {
            type: 'integer',
            description: 'Page number, default 1.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum result size, default 50.',
          },
        },
        required: ['entityHandle'],
        additionalProperties: false,
      },
    },
    {
      toolName: 'generic_create',
      description:
        'Create a Sapling generic record with the same insert permissions as the current user.',
      inputSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          data: {
            type: 'object',
            description: 'Payload for the new record.',
            additionalProperties: true,
          },
        },
        required: ['entityHandle', 'data'],
        additionalProperties: false,
      },
    },
    {
      toolName: 'generic_update',
      description:
        'Update a Sapling generic record with the same update permissions as the current user.',
      inputSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          handle: {
            anyOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'Record handle to update.',
          },
          data: {
            type: 'object',
            description: 'Partial update payload.',
            additionalProperties: true,
          },
          relations: {
            type: 'array',
            description: 'Optional relations to populate in the response.',
            items: { type: 'string' },
          },
        },
        required: ['entityHandle', 'handle', 'data'],
        additionalProperties: false,
      },
    },
    {
      toolName: 'generic_delete',
      description:
        'Delete a Sapling generic record with the same delete permissions as the current user.',
      inputSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          handle: {
            anyOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'Record handle to delete.',
          },
        },
        required: ['entityHandle', 'handle'],
        additionalProperties: false,
      },
    },
  ] as const;

  constructor(private readonly genericService: GenericService) {}

  async listTools(): Promise<
    Array<{
      toolName: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  > {
    return this.toolDefinitions.map((tool) => ({
      toolName: tool.toolName,
      description: tool.description,
      inputSchema: { ...tool.inputSchema },
    }));
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    user: PersonItem,
  ): Promise<{ content: string; rawResult: unknown }> {
    let payload: unknown;

    switch (toolName) {
      case 'generic_list':
        payload = await this.executeGenericList(args, user);
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
      const session = this.requireOwnedSession(this.readSessionId(req), req.user);
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

    server.registerTool(
      'generic_list',
      {
        description:
          'List Sapling generic records with the same read permissions and filters as the current user.',
        inputSchema: {
          entityHandle: z.string().describe('Registered Sapling entity handle.'),
          filter: z.record(z.string(), z.unknown()).optional().describe('Optional MikroORM filter object.'),
          orderBy: z.record(z.string(), z.unknown()).optional().describe('Optional orderBy object.'),
          relations: z.array(z.string()).optional().describe('Optional relations to populate.'),
          page: z.number().int().positive().optional().describe('Page number, default 1.'),
          limit: z.number().int().positive().max(200).optional().describe('Maximum result size, default 50.'),
        },
      },
      async ({ entityHandle, filter, orderBy, relations, page, limit }) => {
        const result = await this.executeGenericList(
          {
            entityHandle,
            filter,
            orderBy,
            relations,
            page,
            limit,
          },
          user,
        );
        return this.createJsonContent(result);
      },
    );

    server.registerTool(
      'generic_create',
      {
        description:
          'Create a Sapling generic record with the same insert permissions as the current user.',
        inputSchema: {
          entityHandle: z.string().describe('Registered Sapling entity handle.'),
          data: z.record(z.string(), z.unknown()).describe('Payload for the new record.'),
        },
      },
      async ({ entityHandle, data }) => {
        const result = await this.executeGenericCreate({ entityHandle, data }, user);
        return this.createJsonContent(result);
      },
    );

    server.registerTool(
      'generic_update',
      {
        description:
          'Update a Sapling generic record with the same update permissions as the current user.',
        inputSchema: {
          entityHandle: z.string().describe('Registered Sapling entity handle.'),
          handle: z.union([z.string(), z.number()]).describe('Record handle to update.'),
          data: z.record(z.string(), z.unknown()).describe('Partial update payload.'),
          relations: z.array(z.string()).optional().describe('Optional relations to populate in the response.'),
        },
      },
      async ({ entityHandle, handle, data, relations }) => {
        const result = await this.executeGenericUpdate(
          {
            entityHandle,
            handle,
            data,
            relations,
          },
          user,
        );
        return this.createJsonContent(result);
      },
    );

    server.registerTool(
      'generic_delete',
      {
        description:
          'Delete a Sapling generic record with the same delete permissions as the current user.',
        inputSchema: {
          entityHandle: z.string().describe('Registered Sapling entity handle.'),
          handle: z.union([z.string(), z.number()]).describe('Record handle to delete.'),
        },
      },
      async ({ entityHandle, handle }) => {
        const result = await this.executeGenericDelete(
          { entityHandle, handle },
          user,
        );

        return this.createJsonContent(result);
      },
    );

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
    const entityHandle = this.requireStringArg(args.entityHandle, 'entityHandle');
    const filter = this.asRecord(args.filter);
    const orderBy = this.asRecord(args.orderBy);
    const relations = this.asStringArray(args.relations);
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

  private async executeGenericCreate(
    args: Record<string, unknown>,
    user: PersonItem,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(args.entityHandle, 'entityHandle');
    const data = this.asRecord(args.data);
    return this.genericService.create(entityHandle, data, user);
  }

  private async executeGenericUpdate(
    args: Record<string, unknown>,
    user: PersonItem,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(args.entityHandle, 'entityHandle');
    const handle = this.requireHandleArg(args.handle, 'handle');
    const data = this.asRecord(args.data);
    const relations = this.asStringArray(args.relations);

    return this.genericService.update(entityHandle, handle, data, user, relations);
  }

  private async executeGenericDelete(
    args: Record<string, unknown>,
    user: PersonItem,
  ): Promise<unknown> {
    const entityHandle = this.requireStringArg(args.entityHandle, 'entityHandle');
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

  private requireHandleArg(
    value: unknown,
    fieldName: string,
  ): string | number {
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