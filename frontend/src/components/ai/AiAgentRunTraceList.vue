<template>
  <div class="sapling-ai-agent-builder__run-list">
    <article
      v-for="(run, runIndex) in runs"
      :key="run.handle ?? `run-${run.startedAt ?? runIndex}`"
      class="sapling-section-panel sapling-ai-agent-builder__mini-card"
    >
      <div class="sapling-row-between-xs">
        <div class="sapling-row-xs">
          <v-chip size="small" variant="tonal">{{ run.status }}</v-chip>
          <v-chip size="small" variant="outlined">{{ run.model || '-' }}</v-chip>
          <v-chip size="small" variant="outlined">{{ run.durationMs ?? '-' }} ms</v-chip>
        </div>
        <span>{{ formatDate(run.completedAt || run.startedAt) }}</span>
      </div>

      <div v-if="getRunToolCalls(run).length" class="sapling-stack-xs">
        <div
          v-for="(toolCall, toolIndex) in getRunToolCalls(run)"
          :key="`${formatToolCallLabel(toolCall)}-${toolIndex}`"
          class="sapling-row-xs"
        >
          <v-chip
            size="small"
            variant="tonal"
            :color="getToolStatusColor(toolCall)"
            :prepend-icon="getToolStatusIcon(toolCall)"
          >
            {{ formatToolCallLabel(toolCall) }}
          </v-chip>
          <span>{{ formatToolCallMeta(toolCall) }}</span>
        </div>
        <p v-if="getRunRepairHints(run).length">
          {{ getRunRepairHints(run).join(' ') }}
        </p>
      </div>

      <div v-if="getRunSources(run).length" class="sapling-row-xs">
        <v-chip
          v-for="(source, sourceIndex) in getRunSources(run)"
          :key="`${formatRunSourceLabel(source)}-${sourceIndex}`"
          size="small"
          variant="outlined"
        >
          {{ formatRunSourceLabel(source) }}
        </v-chip>
      </div>
    </article>
  </div>
</template>

<script lang="ts" setup>
import type { AiAgentRunItem } from '@/entity/entity'

defineProps<{
  runs: AiAgentRunItem[]
}>()

function getRunToolCalls(run: AiAgentRunItem): Record<string, unknown>[] {
  return Array.isArray(run.toolCalls) ? run.toolCalls.filter(isRecord) : []
}

function getRunSources(run: AiAgentRunItem): Record<string, unknown>[] {
  return Array.isArray(run.sources) ? run.sources.filter(isRecord) : []
}

function getRunRepairHints(run: AiAgentRunItem): string[] {
  return getRunToolCalls(run).flatMap((toolCall) => toStringArray(toolCall.repairHints))
}

function formatToolCallLabel(toolCall: Record<string, unknown>): string {
  const serverName = toText(toolCall.serverName)
  const toolName = toText(toolCall.toolName)
  return [serverName, toolName].filter(Boolean).join('.') || 'tool'
}

function formatToolCallMeta(toolCall: Record<string, unknown>): string {
  const parts = [
    toText(toolCall.status),
    formatOptionalNumber(toolCall.resultCount, 'Treffer'),
    formatOptionalNumber(toolCall.durationMs, 'ms'),
  ].filter(Boolean)

  return parts.join(' - ')
}

function getToolStatusColor(toolCall: Record<string, unknown>): string {
  switch (toText(toolCall.status)) {
    case 'success':
      return 'success'
    case 'repair':
      return 'warning'
    case 'blocked':
      return 'info'
    case 'error':
      return 'error'
    default:
      return 'default'
  }
}

function getToolStatusIcon(toolCall: Record<string, unknown>): string {
  switch (toText(toolCall.status)) {
    case 'success':
      return 'mdi-check-circle-outline'
    case 'repair':
      return 'mdi-wrench-outline'
    case 'blocked':
      return 'mdi-lock-outline'
    case 'error':
      return 'mdi-alert-circle-outline'
    default:
      return 'mdi-tools'
  }
}

function formatRunSourceLabel(source: Record<string, unknown>): string {
  const kind = toText(source.kind)
  const entityHandle = toText(source.entityHandle)
  const toolName = toText(source.toolName)
  const path = toText(source.path)

  if (kind === 'navigation' && path) {
    return path
  }

  return [entityHandle, toolName].filter(Boolean).join(' - ') || kind || 'source'
}

function formatOptionalNumber(value: unknown, suffix: string): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? `${value} ${suffix}` : null
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && !!item.trim())
    : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function formatDate(value?: Date | string | null): string {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString()
}
</script>
