<template>
  <v-expansion-panels>
    <v-expansion-panel class="transparent">
      <v-expansion-panel-title>
        {{ panelTitle }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <table class="sapling-table-reference">
            <tr v-for="header in headers" :key="header.key">
              <td class="sapling-table-reference-header">
                {{ header.title }}
              </td>
              <td>
                {{ formatValue(String(object?.[header.key] ?? ''), header.type) }}
              </td>
            </tr>
        </table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
import { defineProps, toRefs } from 'vue';
import { useSaplingReference } from '@/composables/table/useSaplingTableReference';
import '@/assets/styles/SaplingTableReference.css';
import type { SaplingTableHeaderItem } from '@/entity/structure';
import { formatValue } from '../../utils/saplingFormatUtil';

const props = defineProps<{
  object: Record<string, any>;
  headers: SaplingTableHeaderItem[];
}>();
const { object, headers } = toRefs(props);
const { panelTitle } = useSaplingReference(object, headers);
</script>
