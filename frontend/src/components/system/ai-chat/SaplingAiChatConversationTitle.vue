<template>
  <div class="sapling-chat-conversation__heading sapling-ai-chat__conversation-heading">
    <div class="sapling-row-xs sapling-chat-conversation__title-row">
      <div
        class="sapling-section-title sapling-chat-conversation__title sapling-ai-chat__conversation-title"
      >
        {{ truncatedTitle }}
      </div>
      <v-tooltip v-if="isTruncated" location="top" max-width="400">
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            icon="mdi-information-outline"
            class="sapling-chat-conversation__title-info sapling-ai-chat__title-info"
            size="small"
          />
        </template>

        <span>{{ title }}</span>
      </v-tooltip>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    titlePreviewLimit?: number
  }>(),
  {
    titlePreviewLimit: 30,
  },
)

const isTruncated = computed(() => props.title.length > props.titlePreviewLimit)
const truncatedTitle = computed(() =>
  isTruncated.value ? `${props.title.slice(0, props.titlePreviewLimit)}...` : props.title,
)
</script>
