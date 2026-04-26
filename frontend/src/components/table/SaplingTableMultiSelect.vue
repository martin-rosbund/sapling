<template>
  <div v-if="multiSelect" class="sapling-table-toolbar-selection">
    <v-icon color="primary" size="small">mdi-checkbox-multiple-marked</v-icon>
    <span class="sapling-table-toolbar-selection-count">{{ selectedCount }}</span>
    <span v-if="!isTranslationLoading" class="sapling-table-toolbar-selection-label">
      {{ $t('global.selected') }}
    </span>
    <v-skeleton-loader v-else class="sapling-table-toolbar-selection-skeleton" type="text" />

    <v-menu v-if="hasSelectionActions" location="bottom start">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          class="sapling-table-toolbar-menu-btn"
          icon="mdi-dots-vertical"
          variant="text"
          size="small"
          :aria-label="isTranslationLoading ? undefined : $t('global.selectionActions')"
          :title="isTranslationLoading ? undefined : $t('global.selectionActions')"
        />
      </template>
      <v-list class="glass-panel">
        <div v-if="isTranslationLoading" class="sapling-table-toolbar-selection-menu__loading">
          <v-skeleton-loader type="text, text, text" />
        </div>
        <template v-else>
          <v-list-item v-if="canClearSelection" @click="clearSelection">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.clearSelection') }}</span>
          </v-list-item>
          <v-list-item v-if="canExportSelection" @click="exportSelected">
            <v-icon start>mdi-download-multiple</v-icon>
            <span>{{ $t('global.exportSelected') }}</span>
          </v-list-item>
          <v-list-item v-if="canSelectAll" @click="selectAll">
            <v-icon start>mdi-select-all</v-icon>
            <span>{{ $t('global.selectAll') }}</span>
          </v-list-item>
          <v-list-item v-if="canDeleteSelection" @click="deleteAllSelected">
            <v-icon start>mdi-delete</v-icon>
            <span>{{ $t('global.deleteSelected') }}</span>
          </v-list-item>
          <template v-if="canRunScriptButtons">
            <v-list-item
              v-for="scriptButton in scriptButtons"
              :key="String(scriptButton.handle ?? scriptButton.name)"
              @click="runScriptButton(scriptButton)"
            >
              <v-icon start>mdi-script-text-play-outline</v-icon>
              <span>{{ resolveScriptButtonTitle(scriptButton.title) }}</span>
            </v-list-item>
          </template>
        </template>
      </v-list>
    </v-menu>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import {
  useSaplingTableMultiSelect,
  type UseSaplingTableMultiSelectEmit,
  type UseSaplingTableMultiSelectProps,
} from '@/composables/table/useSaplingTableMultiSelect'

const props = defineProps<UseSaplingTableMultiSelectProps>()
const emit = defineEmits<UseSaplingTableMultiSelectEmit>()
const { isLoading: isTranslationLoading } = useTranslationLoader('global')
const { t, te } = useI18n()

const {
  selectedCount,
  hasSelectionActions,
  canClearSelection,
  canExportSelection,
  canSelectAll,
  canRunScriptButtons,
  canDeleteSelection,
  scriptButtons,
  clearSelection,
  deleteAllSelected,
  exportSelected,
  runScriptButton,
  selectAll,
} = useSaplingTableMultiSelect(props, emit)

function resolveScriptButtonTitle(title: string) {
  return te(title) ? t(title) : title
}
</script>
