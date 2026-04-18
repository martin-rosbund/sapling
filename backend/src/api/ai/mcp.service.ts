import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpServerConfigItem } from '../../entity/McpServerConfigItem';
import { PersonItem } from '../../entity/PersonItem';
import { SaplingMcpService } from './sapling-mcp.service';

export interface McpToolDescriptor {
  serverHandle: number;
  serverName: string;
  toolName: string;
  description?: string;
  inputSchema?: Record<string, unknown> | null;
}

export interface McpInlineToolExecution {
  serverHandle: number;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  content: string;
  rawResult: unknown;
}

@Injectable()
export class McpService {
  constructor(
    private readonly em: EntityManager,
    private readonly saplingMcpService: SaplingMcpService,
  ) {}

  async listActiveTools(user?: PersonItem): Promise<McpToolDescriptor[]> {
    const configs = await this.em.find(
      McpServerConfigItem,
      { isActive: true },
      { orderBy: { sortOrder: 'ASC', name: 'ASC' } },
    );

    const descriptors: McpToolDescriptor[] = user
      ? (await this.saplingMcpService.listTools()).map((tool) => ({
          serverHandle: 0,
          serverName: this.saplingMcpService.getServerName(),
          toolName: tool.toolName,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }))
      : [];

    for (const config of configs) {
      try {
        const tools = await this.listToolsForConfig(config);
        descriptors.push(...tools);
      } catch {
        continue;
      }
    }

    return descriptors;
  }

  async tryExecuteInlineToolCommand(
    content: string,
    user?: PersonItem,
  ): Promise<McpInlineToolExecution | null> {
    const parsedCommand = this.parseInlineToolCommand(content);
    if (!parsedCommand) {
      return null;
    }

    if ('error' in parsedCommand) {
      const errorMessage = parsedCommand.error ?? 'Invalid /tool command.';

      return {
        serverHandle: 0,
        serverName: parsedCommand.serverName ?? '',
        toolName: parsedCommand.toolName ?? '',
        arguments: {},
        content: errorMessage,
        rawResult: {
          error: errorMessage,
        },
      };
    }

    try {
      return await this.executeTool(
        parsedCommand.serverName,
        parsedCommand.toolName,
        parsedCommand.arguments,
        user,
      );
    } catch {
      // Fall through to the user-facing not-found result below.
    }

    return {
      serverHandle: 0,
      serverName: parsedCommand.serverName ?? '',
      toolName: parsedCommand.toolName,
      arguments: parsedCommand.arguments,
      content: parsedCommand.serverName
        ? `No active MCP server named "${parsedCommand.serverName}" could execute tool "${parsedCommand.toolName}".`
        : `No active MCP server could execute tool "${parsedCommand.toolName}".` ,
      rawResult: {
        error: 'tool_not_found',
      },
    };
  }

  async executeTool(
    serverName: string | undefined,
    toolName: string,
    args: Record<string, unknown>,
    user?: PersonItem,
  ): Promise<McpInlineToolExecution> {
    if (user) {
      const internalServerName = this.saplingMcpService.getServerName();
      const internalTools = await this.saplingMcpService.listTools();
      const internalTool = internalTools.find(
        (tool) => tool.toolName === toolName,
      );
      const targetsInternal =
        !serverName || serverName.trim().toLowerCase() === internalServerName;

      if (targetsInternal && internalTool) {
        const result = await this.saplingMcpService.executeTool(
          toolName,
          args,
          user,
        );

        return {
          serverHandle: 0,
          serverName: internalServerName,
          toolName,
          arguments: args,
          content: result.content,
          rawResult: result.rawResult,
        };
      }

      if (
        serverName?.trim().toLowerCase() === internalServerName &&
        !internalTool
      ) {
        throw new Error('tool_not_found');
      }
    }

    const configs = await this.em.find(
      McpServerConfigItem,
      { isActive: true },
      { orderBy: { sortOrder: 'ASC', name: 'ASC' } },
    );

    const targetConfig = serverName
      ? configs.find(
          (config) =>
            config.name.trim().toLowerCase() === serverName.trim().toLowerCase(),
        )
      : undefined;

    const candidateConfigs = targetConfig ? [targetConfig] : configs;

    for (const config of candidateConfigs) {
      try {
        const result = await this.callTool(config, toolName, args);
        return {
          serverHandle: config.handle ?? 0,
          serverName: config.name,
          toolName,
          arguments: args,
          content: result.content,
          rawResult: result.rawResult,
        };
      } catch {
        continue;
      }
    }

    throw new Error('tool_not_found');
  }

  private async listToolsForConfig(
    config: McpServerConfigItem,
  ): Promise<McpToolDescriptor[]> {
    const { client, transport } = await this.connectClient(config);

    try {
      const response = await client.listTools();
      return response.tools.map((tool) => ({
        serverHandle: config.handle ?? 0,
        serverName: config.name,
        toolName: tool.name,
        description: tool.description,
        inputSchema:
          typeof tool.inputSchema === 'object' && tool.inputSchema != null
            ? (tool.inputSchema as Record<string, unknown>)
            : null,
      }));
    } finally {
      await client.close();
      await transport.close();
    }
  }

  private async callTool(
    config: McpServerConfigItem,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ content: string; rawResult: unknown }> {
    const { client, transport } = await this.connectClient(config);

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      const rawContent = 'content' in result && Array.isArray(result.content) ? result.content : [];
      const content = rawContent
        .map((item) => {
          if (item.type === 'text') {
            return item.text;
          }

          return JSON.stringify(item);
        })
        .join('\n')
        .trim();

      return {
        content: content || JSON.stringify(result, null, 2),
        rawResult: result,
      };
    } finally {
      await client.close();
      await transport.close();
    }
  }

  private async connectClient(config: McpServerConfigItem) {
    const client = new Client({ name: 'sapling-ai', version: '1.0.0' });
    const transport = this.createTransport(config);
    await client.connect(transport);
    return { client, transport };
  }

  private createTransport(config: McpServerConfigItem) {
    const headers = {
      ...(config.headers ?? {}),
      ...this.resolveAuthHeaders(config),
    };

    if (config.transport === 'stdio') {
      if (!config.command) {
        throw new Error('ai.mcpCommandMissing');
      }

      return new StdioClientTransport({
        command: config.command,
        args: config.args ?? undefined,
        env: config.environment ?? undefined,
        stderr: 'pipe',
      });
    }

    if (!config.endpoint) {
      throw new Error('ai.mcpEndpointMissing');
    }

    return new StreamableHTTPClientTransport(new URL(config.endpoint), {
      requestInit: {
        headers,
      },
    });
  }

  private resolveAuthHeaders(config: McpServerConfigItem): Record<string, string> {
    const authConfig = config.authConfig;
    if (!authConfig || typeof authConfig !== 'object') {
      return {};
    }

    const record = authConfig as Record<string, unknown>;
    if (record.type === 'bearer' && typeof record.token === 'string') {
      return { Authorization: `Bearer ${record.token}` };
    }

    return {};
  }

  private parseInlineToolCommand(content: string) {
    const match = content.trim().match(/^\/tool\s+([^\s]+)(?:\s+([\s\S]+))?$/i);
    if (!match) {
      return null;
    }

    const target = match[1]?.trim() ?? '';
    const payload = match[2]?.trim() ?? '';
    const separatorIndex = target.indexOf('.');
    const serverName = separatorIndex >= 0 ? target.slice(0, separatorIndex) : undefined;
    const toolName = separatorIndex >= 0 ? target.slice(separatorIndex + 1) : target;

    let parsedArguments: Record<string, unknown> = {};
    if (payload) {
      try {
        parsedArguments = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        return {
          serverName,
          toolName,
          error:
            'Invalid /tool JSON arguments. Example: /tool myServer.myTool {"query":"status"}',
        };
      }
    }

    return {
      serverName,
      toolName,
      arguments: parsedArguments,
    };
  }
}