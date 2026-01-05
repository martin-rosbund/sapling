<template>
  <div>
    <v-btn size="small" class="glass-panel" @click.stop="openJsonDialog(template.key)">
      <v-icon class="pr-3" left>mdi-code-json</v-icon>
      {{ $t(`global.show`) }}
    </v-btn>
    <v-dialog v-model:modelValue="jsonDialogKeyRef[template.key]" min-width="90vw" min-height="90vh" max-width="90vw" max-height="90vh" >
      <v-card class="glass-panel">
        <v-card-title>{{ $t(`${entityName}.${template.name}`) }}</v-card-title>
        <v-card-text>
          <MonacoEditor class="transparent"
            v-model:value="formattedJson"
            language="json"
            :theme="loadTheme"
            :options="editorOptions"
            style="height: 75vh; width: 100%;"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" text @click="closeJsonDialog">{{ $t(`global.close`) }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingTableJson } from '@/composables/table/useSaplingTableJson';
import type { SaplingGenericItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import MonacoEditor from 'monaco-editor-vue3';

const props = defineProps<{
  item: SaplingGenericItem;
  template: EntityTemplate;
  entityName: string;
}>();

const {
  jsonDialogKeyRef,
  openJsonDialog,
  closeJsonDialog,
  formattedJson,
  loadTheme,
  editorOptions
} = useSaplingTableJson(props);
</script>
