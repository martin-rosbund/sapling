import { Injectable } from '@nestjs/common';
import {
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/generative-ai';
import type { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { PersonItem } from '../../entity/PersonItem';
import { createGeminiClient } from './gemini-ai.runtime';
import { createOpenAiClient } from './openai-ai.runtime';
import { McpService, type McpToolDescriptor } from './mcp.service';
import type {
  AiClientTimeContext,
  AiExecutedToolCall,
  AiStreamResult,
  AiToolErrorPayload,
  AiToolRegistryEntry,
} from './ai.types';
import {
  buildGeminiFunctionDeclarations,
  buildOpenAiTools,
  buildToolCallSignature,
  buildToolRegistry,
  isToolErrorPayload,
  normalizeFunctionCallArgs,
  parseToolArguments,
  resolveToolRegistryEntry,
} from './ai-tool-call.utils';
import { extractClientTimeContextFromHistory } from './ai-client-time.utils';
import {
  AI_GEMINI_REPEATED_TOOL_CALL_ABORT_MESSAGE,
  AI_GEMINI_TOOL_CALL_LIMIT_MESSAGE,
  buildSystemInstruction,
  buildToolFailureAssistantMessage,
} from './prompts/ai.prompts';

type AiRuntimeToolExecutor = (
  entry: AiToolRegistryEntry,
  args: Record<string, unknown>,
) => Promise<
  Awaited<ReturnType<AiChatRuntimeService['executeAutomaticToolCall']>>
>;

@Injectable()
export class AiChatRuntimeService {
  constructor(private readonly mcpService: McpService) {}

  async streamOpenAi(
    history: AiChatMessageItem[],
    provider: AiProviderTypeItem,
    model: string,
    availableTools: McpToolDescriptor[],
    user: PersonItem,
    maxToolCallIterations: number,
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
    supportsTools = true,
    agentInstruction?: string | null,
    toolExecutor?: AiRuntimeToolExecutor,
  ): Promise<AiStreamResult> {
    const toolRegistry = supportsTools ? buildToolRegistry(availableTools) : [];
    const messages = this.buildOpenAiMessages(
      history,
      user,
      clientTimeContext,
      toolRegistry.length > 0,
      agentInstruction,
    );
    const executedToolCalls: AiExecutedToolCall[] = [];

    for (let iteration = 0; iteration < maxToolCallIterations; iteration += 1) {
      const response = await createOpenAiClient(
        provider,
      ).chat.completions.create({
        model,
        messages: messages as never,
        ...(toolRegistry.length > 0
          ? {
              tools: buildOpenAiTools(toolRegistry),
              tool_choice: 'auto' as const,
            }
          : {}),
      });

      const assistantMessage = response.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error('ai.emptyResponse');
      }

      const toolCalls = assistantMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const content = assistantMessage.content ?? '';
        await onDelta(content);
        return { toolCalls: executedToolCalls };
      }

      messages.push({
        role: 'assistant',
        content: assistantMessage.content ?? '',
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
          continue;
        }

        const args = parseToolArguments(toolCall.function.arguments);
        const registryEntry = resolveToolRegistryEntry(
          toolRegistry,
          toolCall.function.name,
        );

        if (!registryEntry) {
          throw new Error(`ai.toolNotFound:${toolCall.function.name}`);
        }

        const toolExecution = toolExecutor
          ? await toolExecutor(registryEntry, args)
          : await this.executeAutomaticToolCall(
              toolRegistry,
              toolCall.function.name,
              args,
              user,
            );

        executedToolCalls.push({
          serverHandle: toolExecution.serverHandle,
          serverName: toolExecution.serverName,
          toolName: toolExecution.toolName,
          arguments: args,
          modelResult: toolExecution.modelResult,
          rawResult: toolExecution.rawResult,
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolExecution.content,
        });
      }
    }

    throw new Error('ai.toolCallLimitExceeded');
  }

  async streamGemini(
    history: AiChatMessageItem[],
    provider: AiProviderTypeItem,
    modelName: string,
    availableTools: McpToolDescriptor[],
    user: PersonItem,
    maxToolCallIterations: number,
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
    supportsTools = true,
    agentInstruction?: string | null,
    toolExecutor?: AiRuntimeToolExecutor,
  ): Promise<AiStreamResult> {
    const toolRegistry = supportsTools ? buildToolRegistry(availableTools) : [];
    const conversation = this.buildGeminiConversation(history);
    const currentTurn = conversation.pop();

    if (!currentTurn || currentTurn.role !== 'user') {
      throw new Error('ai.invalidHistory');
    }

    if (toolRegistry.length === 0) {
      return this.streamGeminiWithoutTools(
        provider,
        modelName,
        conversation,
        currentTurn.parts,
        user,
        clientTimeContext,
        onDelta,
        agentInstruction,
      );
    }

    try {
      const functionDeclarations =
        buildGeminiFunctionDeclarations(toolRegistry);

      return await this.streamGeminiWithTools(
        provider,
        modelName,
        conversation,
        currentTurn.parts,
        toolRegistry,
        functionDeclarations,
        user,
        maxToolCallIterations,
        clientTimeContext,
        onDelta,
        agentInstruction,
        toolExecutor,
      );
    } catch (error) {
      this.logGeminiToolModeError(
        error,
        modelName,
        toolRegistry.map((entry) => entry.encodedName),
      );

      return this.streamGeminiWithoutTools(
        provider,
        modelName,
        conversation,
        currentTurn.parts,
        user,
        clientTimeContext,
        onDelta,
        agentInstruction,
      );
    }
  }

  buildSystemInstruction(options?: {
    includeToolGuidance?: boolean;
    user?: PersonItem;
    clientTimeContext?: AiClientTimeContext;
    agentInstruction?: string | null;
  }): string {
    return buildSystemInstruction({
      includeToolGuidance: options?.includeToolGuidance,
      user: options?.user,
      clientTimeContext: options?.clientTimeContext,
      agentInstruction: options?.agentInstruction,
      referenceDate: new Date(),
    });
  }

  async executeAutomaticToolCall(
    toolRegistry: AiToolRegistryEntry[],
    encodedName: string,
    args: Record<string, unknown>,
    user: PersonItem,
  ) {
    const entry = resolveToolRegistryEntry(toolRegistry, encodedName);

    if (!entry) {
      throw new Error(`ai.toolNotFound:${encodedName}`);
    }

    return this.mcpService.executeTool(
      entry.descriptor.serverName,
      entry.descriptor.toolName,
      args,
      user,
    );
  }

  private async streamGeminiWithTools(
    provider: AiProviderTypeItem,
    modelName: string,
    conversation: Content[],
    currentTurnParts: Part[],
    toolRegistry: AiToolRegistryEntry[],
    functionDeclarations: FunctionDeclaration[],
    user: PersonItem,
    maxToolCallIterations: number,
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
    agentInstruction?: string | null,
    toolExecutor?: AiRuntimeToolExecutor,
  ): Promise<AiStreamResult> {
    const generativeModel = createGeminiClient(provider).getGenerativeModel({
      model: modelName,
      ...(functionDeclarations.length > 0
        ? {
            tools: [
              {
                functionDeclarations,
              },
            ],
          }
        : {}),
      systemInstruction: this.buildSystemInstruction({
        includeToolGuidance: true,
        user,
        clientTimeContext,
        agentInstruction,
      }),
    });

    const chat = generativeModel.startChat({ history: conversation });
    const executedToolCalls: AiExecutedToolCall[] = [];
    const repeatedCallCounts = new Map<string, number>();
    let consecutiveToolErrorIterations = 0;
    let result = await chat.sendMessage(currentTurnParts);

    for (let iteration = 0; iteration < maxToolCallIterations; iteration += 1) {
      const functionCalls = result.response.functionCalls() ?? [];

      if (functionCalls.length === 0) {
        const content = result.response.text();
        await onDelta(content);
        return { toolCalls: executedToolCalls };
      }

      const functionResponses: Part[] = [];
      const toolErrors: AiToolErrorPayload[] = [];

      for (const functionCall of functionCalls) {
        const args = normalizeFunctionCallArgs(functionCall);
        const toolCallSignature = buildToolCallSignature(
          functionCall.name,
          args,
        );
        const repeatedCallCount =
          (repeatedCallCounts.get(toolCallSignature) ?? 0) + 1;

        repeatedCallCounts.set(toolCallSignature, repeatedCallCount);

        if (repeatedCallCount > 2) {
          await onDelta(AI_GEMINI_REPEATED_TOOL_CALL_ABORT_MESSAGE);
          return { toolCalls: executedToolCalls };
        }

        const registryEntry = resolveToolRegistryEntry(
          toolRegistry,
          functionCall.name,
        );

        if (!registryEntry) {
          throw new Error(`ai.toolNotFound:${functionCall.name}`);
        }

        const toolExecution = toolExecutor
          ? await toolExecutor(registryEntry, args)
          : await this.executeAutomaticToolCall(
              toolRegistry,
              functionCall.name,
              args,
              user,
            );

        executedToolCalls.push({
          serverHandle: toolExecution.serverHandle,
          serverName: toolExecution.serverName,
          toolName: toolExecution.toolName,
          arguments: args,
          modelResult: toolExecution.modelResult,
          rawResult: toolExecution.rawResult,
        });

        if (isToolErrorPayload(toolExecution.rawResult)) {
          toolErrors.push(toolExecution.rawResult);
        }

        functionResponses.push({
          functionResponse: {
            name: functionCall.name,
            response: {
              content: toolExecution.modelResult,
            },
          },
        });
      }

      if (toolErrors.length === functionCalls.length) {
        consecutiveToolErrorIterations += 1;
      } else {
        consecutiveToolErrorIterations = 0;
      }

      if (consecutiveToolErrorIterations >= 2) {
        await onDelta(buildToolFailureAssistantMessage(toolErrors));
        return { toolCalls: executedToolCalls };
      }

      result = await chat.sendMessage(functionResponses);
    }

    await onDelta(AI_GEMINI_TOOL_CALL_LIMIT_MESSAGE);
    return { toolCalls: executedToolCalls };
  }

  private async streamGeminiWithoutTools(
    provider: AiProviderTypeItem,
    modelName: string,
    conversation: Content[],
    currentTurnParts: Part[],
    user: PersonItem,
    clientTimeContext: AiClientTimeContext | undefined,
    onDelta: (delta: string) => Promise<void>,
    agentInstruction?: string | null,
  ): Promise<AiStreamResult> {
    const generativeModel = createGeminiClient(provider).getGenerativeModel({
      model: modelName,
      systemInstruction: this.buildSystemInstruction({
        user,
        clientTimeContext,
        agentInstruction,
      }),
    });

    const chat = generativeModel.startChat({ history: conversation });
    const result = await chat.sendMessage(currentTurnParts);
    await onDelta(result.response.text());
    return { toolCalls: [] };
  }

  private logGeminiToolModeError(
    error: unknown,
    modelName: string,
    functionNames: string[],
  ): void {
    const errorMessage =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    const requestedFunctionName =
      error instanceof Error && error.message.startsWith('ai.toolNotFound:')
        ? error.message.slice('ai.toolNotFound:'.length)
        : null;

    global.log?.error?.(
      [
        `Gemini tool mode failed for model ${modelName}. Falling back to plain chat.`,
        `Functions: ${functionNames.join(', ')}`,
        ...(requestedFunctionName
          ? [`Requested function: ${requestedFunctionName}`]
          : []),
        errorMessage,
      ].join('\n'),
    );
  }

  private buildOpenAiMessages(
    history: AiChatMessageItem[],
    user?: PersonItem,
    clientTimeContext?: AiClientTimeContext,
    includeToolGuidance = true,
    agentInstruction?: string | null,
  ) {
    const messages: Array<Record<string, unknown>> = [
      {
        role: 'system',
        content: this.buildSystemInstruction({
          includeToolGuidance,
          user,
          clientTimeContext:
            clientTimeContext ?? extractClientTimeContextFromHistory(history),
          agentInstruction,
        }),
      },
    ];

    for (const message of this.normalizeHistory(history)) {
      messages.push({
        role: message.role,
        content: this.buildMessageContent(message),
      });
    }

    return messages;
  }

  private buildGeminiConversation(history: AiChatMessageItem[]): Content[] {
    return this.normalizeHistory(history).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: this.buildMessageContent(message) }],
    }));
  }

  private normalizeHistory(history: AiChatMessageItem[]): AiChatMessageItem[] {
    return history.filter((message) => {
      if (message.role !== 'user' && message.role !== 'assistant') {
        return false;
      }

      if (
        message.role === 'assistant' &&
        message.status === 'streaming' &&
        !message.content.trim()
      ) {
        return false;
      }

      return true;
    });
  }

  private buildMessageContent(message: AiChatMessageItem): string {
    const contextPrefix =
      message.role === 'user' && message.contextPayload
        ? `\n\nContext: ${JSON.stringify(message.contextPayload)}`
        : '';

    return `${message.content}${contextPrefix}`;
  }
}
