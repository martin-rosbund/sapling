import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AiAgentItem } from '../../entity/AiAgentItem';
import { AiAgentPlaybookItem } from '../../entity/AiAgentPlaybookItem';
import { AiAgentRunItem } from '../../entity/AiAgentRunItem';
import { AiAgentVersionItem } from '../../entity/AiAgentVersionItem';
import { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import { AiChatSessionItem } from '../../entity/AiChatSessionItem';
import { PersonItem } from '../../entity/PersonItem';
import type { AiExecutedToolCall } from './ai.types';
import { buildNavigationLinks } from './ai-navigation.utils';
import {
  countAiToolResultItems,
  extractAiToolEntityHandles,
  resolveAiToolCallStatus,
} from './ai-tool-trace.utils';

export type CreateAiAgentRunInput = {
  session: AiChatSessionItem;
  message: AiChatMessageItem;
  person: PersonItem;
  agent: AiAgentItem | null;
  version: AiAgentVersionItem | null;
  playbook: AiAgentPlaybookItem | null;
  provider: string;
  model: string;
  contextEntityHandle: string | null;
  contextRecordHandle: string | null;
};

export type CompleteAiAgentRunPatch = {
  status: string;
  responseText?: string | null;
  toolCalls?: Record<string, unknown>[] | null;
  sources?: Record<string, unknown>[] | null;
  pendingActions?: Record<string, unknown>[] | null;
  usagePayload?: Record<string, unknown> | null;
  errorPayload?: Record<string, unknown> | null;
};

@Injectable()
export class AiAgentRunLifecycleService {
  constructor(private readonly em: EntityManager) {}

  async createRun(input: CreateAiAgentRunInput): Promise<AiAgentRunItem> {
    const run = this.em.create(AiAgentRunItem, {
      session: input.session,
      message: input.message,
      person: input.person,
      agent: input.agent,
      agentVersion: input.version,
      playbook: input.playbook,
      status: 'running',
      provider: input.provider,
      model: input.model,
      contextEntityHandle: input.contextEntityHandle,
      contextRecordHandle: input.contextRecordHandle,
      startedAt: new Date(),
    });

    this.em.persist(run);
    await this.em.flush();
    return run;
  }

  completeRun(run: AiAgentRunItem, patch: CompleteAiAgentRunPatch): void {
    const completedAt = new Date();
    run.status = patch.status;
    run.completedAt = completedAt;
    run.durationMs = Math.max(
      0,
      completedAt.getTime() -
        (run.startedAt?.getTime() ?? completedAt.getTime()),
    );
    run.responseText = patch.responseText ?? run.responseText ?? null;
    run.toolCalls = patch.toolCalls ?? run.toolCalls ?? null;
    run.sources = patch.sources ?? run.sources ?? null;
    run.pendingActions = patch.pendingActions ?? run.pendingActions ?? null;
    run.usagePayload = patch.usagePayload ?? run.usagePayload ?? null;
    run.errorPayload = patch.errorPayload ?? run.errorPayload ?? null;
  }

  buildSources(
    toolCalls: AiExecutedToolCall[],
    navigationLinks: ReturnType<typeof buildNavigationLinks>,
  ): Record<string, unknown>[] {
    const sources = new Map<string, Record<string, unknown>>();

    for (const link of navigationLinks) {
      sources.set(`navigation:${link.path}`, {
        kind: 'navigation',
        path: link.path,
        entityHandle: link.entityHandle,
        navigationKind: link.kind,
      });
    }

    for (const toolCall of toolCalls) {
      const sourceEntityHandles =
        toolCall.sourceEntityHandles ??
        extractAiToolEntityHandles(toolCall.rawResult);

      for (const entityHandle of sourceEntityHandles) {
        sources.set(
          `tool:${toolCall.serverName}:${toolCall.toolName}:${entityHandle}`,
          {
            kind: 'tool',
            serverName: toolCall.serverName,
            toolName: toolCall.toolName,
            entityHandle,
            status:
              toolCall.status ?? resolveAiToolCallStatus(toolCall.rawResult),
            resultCount:
              toolCall.resultCount ??
              countAiToolResultItems(toolCall.rawResult),
          },
        );
      }
    }

    return [...sources.values()];
  }
}
