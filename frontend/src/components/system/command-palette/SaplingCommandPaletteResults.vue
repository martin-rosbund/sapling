<template>
  <div class="sapling-command-palette__results" role="listbox">
    <template v-if="isLoading">
      <div class="sapling-command-palette__loading">
        <v-progress-circular indeterminate size="24" width="2" color="primary" />
      </div>
    </template>

    <template v-else-if="groupedResults.length === 0">
      <div class="sapling-command-palette__empty">
        {{ emptyLabel }}
      </div>
    </template>

    <template v-else>
      <template v-for="(group, groupIndex) in groupedResults" :key="group.key">
        <div class="sapling-command-palette__group-label">{{ group.label }}</div>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="sapling-command-palette__item"
          :class="{ 'sapling-command-palette__item--active': item.flatIndex === activeIndex }"
          role="option"
          :aria-selected="item.flatIndex === activeIndex"
          @mouseenter="emit('updateActiveIndex', item.flatIndex)"
          @click="emit('selectItem', item)"
        >
          <v-icon size="20" class="sapling-command-palette__item-icon">
            {{ item.icon }}
          </v-icon>
          <span class="sapling-command-palette__item-label">{{ item.label }}</span>
          <span v-if="item.hint" class="sapling-command-palette__item-hint">
            {{ item.hint }}
          </span>
        </button>
        <v-divider
          v-if="groupIndex < groupedResults.length - 1"
          class="sapling-command-palette__group-divider"
        />
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from '@/components/system/command-palette/commandPalette.types'

defineProps<{
  isLoading: boolean
  groupedResults: CommandPaletteGroup[]
  activeIndex: number
  emptyLabel: string
}>()

const emit = defineEmits<{
  updateActiveIndex: [index: number]
  selectItem: [item: CommandPaletteItem]
}>()
</script>
