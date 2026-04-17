<template>
  <div>
    <v-btn
      size="small"
      class="glass-panel"
      :rounded="false"
      :max-height="32"
      @click.stop="openJsonDialog()"
    >
      <v-icon class="pr-3" left>mdi-code-json</v-icon>
      {{ $t(`global.show`) }}
    </v-btn>
    <v-dialog
      v-model:modelValue="isDialogOpen"
      min-width="90vw"
      min-height="90vh"
      max-width="90vw"
      max-height="90vh"
      persistent
    >
      <v-card class="glass-panel sapling-dialog-json-card" style="height: 100%; min-height: 90vh">
        <div class="sapling-dialog-shell sapling-fill-shell">
          <v-card-title class="sapling-dialog-json-title">{{ $t(dialogTitleKey) }}</v-card-title>
          <v-card-text class="sapling-dialog-json-content">
            <MonacoEditor
              v-model:value="formattedJson"
              language="json"
              :theme="editorTheme"
              :options="editorOptions"
              class="sapling-dialog-json-editor"
            />
          </v-card-text>
        </div>
        <SaplingActionClose :close="closeJsonDialog" />
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import MonacoEditor from 'monaco-editor-vue3'
import {
  useSaplingTableJson,
  type UseSaplingTableJsonProps,
} from '@/composables/table/useSaplingTableJson'
import SaplingActionClose from '../actions/SaplingActionClose.vue'

const props = defineProps<UseSaplingTableJsonProps>()

const {
  isDialogOpen,
  openJsonDialog,
  closeJsonDialog,
  formattedJson,
  dialogTitleKey,
  editorTheme,
  editorOptions,
} = useSaplingTableJson(props)
</script>
