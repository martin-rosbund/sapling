<template>
  <v-expansion-panels>
    <v-expansion-panel>
      <v-expansion-panel-title>
        {{ panelTitle }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <table class="sapling-table-reference">
          <tbody>
            <tr v-for="header in headers" :key="header.key">
              <td class="sapling-table-reference-header">
                {{ header.title }}
              </td>
              <td>
                {{ formatValue(String(object?.[header.key] ?? ''), header.type) }}
              </td>
            </tr>
          </tbody>
        </table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
import { defineProps, toRefs } from 'vue';
import { useSaplingReference } from '@/composables/table/useSaplingTableReference';
import '@/assets/styles/SaplingTableReference.css';

interface Header {
  key: string;
  title: string;
  type?: string;
}

const props = defineProps<{
  object: Record<string, any>;
  headers: Header[];
  formatValue: (value: string, type?: string) => string;
}>();
const { object, headers, formatValue } = toRefs(props);
const { panelTitle } = useSaplingReference(object, headers, formatValue);
</script>
