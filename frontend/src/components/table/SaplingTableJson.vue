<template>
  <div>
    <v-btn size="small" class="glass-panel" @click.stop="openJsonDialog(template.key)">{{ $t(`global.show`) }}</v-btn>
    <v-dialog v-model:modelValue="jsonDialogKeyRef[template.key]" max-width="600px">
      <v-card class="glass-panel">
        <v-card-title>{{ $t(`${entityName}.${template.name}`) }}</v-card-title>
        <v-card-text>
          <pre style="white-space: pre-wrap; word-break: break-all;">
            {{ formattedJson }}
          </pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" text @click="closeJsonDialog">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingTableJson } from '@/composables/table/useSaplingTableJson';
import type { SaplingGenericItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { computed } from 'vue';

const props = defineProps<{
  item: SaplingGenericItem;
  template: EntityTemplate;
  entityName: string;
}>();

const { jsonDialogKeyRef, openJsonDialog, closeJsonDialog } = useSaplingTableJson(props);
const formattedJson = computed(() => JSON.stringify(props.item[props.template.key || ''] ?? {}, null, 2).trim());
</script>
