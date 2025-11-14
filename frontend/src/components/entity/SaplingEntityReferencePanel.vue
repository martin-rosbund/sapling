<template>
  <v-expansion-panels>
    <v-expansion-panel>
      <v-expansion-panel-title class="entity-expansion-title">
        {{ getReferenceDisplayShort(referenceObject, col) || (col.referenceName || $t('global.details')) }}
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <table class="child-row-table">
          <tbody>
            <tr v-for="refCol in getReferenceColumns(col.referenceName)" :key="refCol.key" @click="$emit('reference-click')" style="cursor:pointer;">
              <th>{{ $t(`${col.referenceName}.${refCol.name}`) }}</th>
              <td>{{ (referenceObject && referenceObject[refCol.key]) ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
<script lang="ts" setup>
import { defineProps } from 'vue';
import type { EntityTemplate } from '@/entity/structure';

defineProps<{
  referenceObject: Record<string, unknown>;
  col: EntityTemplate;
  getReferenceColumns: (referenceName: string) => EntityTemplate[];
  getReferenceDisplayShort: (obj: Record<string, unknown>, col: EntityTemplate) => string;
}>();
</script>
