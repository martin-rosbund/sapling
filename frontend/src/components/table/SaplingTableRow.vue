<template>
  <!-- Table row for entity table, modularized for reuse and clarity -->
  <tr
    :class="{ 'selected-row': selectedRow === index }"
    @click="$emit('select-row', index)"
    style="cursor: pointer;"
  >
    <!-- Actions cell at the start of the row -->
    <td v-if="showActions" class="actions-cell">
      <v-menu ref="menuRef" v-model="menuActive">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="small" @click.stop></v-btn>
        </template>
        <v-list>
          <v-list-item v-if="entity?.canUpdate && entityPermission?.allowUpdate" @click.stop="$emit('edit', item)">
            <v-icon start>mdi-pencil</v-icon>
            <span>{{ $t('global.edit') }}</span>
          </v-list-item>
          <v-list-item v-if="entity?.canDelete && entityPermission?.allowDelete" @click.stop="$emit('delete', item)">
            <v-icon start>mdi-delete</v-icon>
            <span>{{ $t('global.delete') }}</span>
          </v-list-item>
          <v-list-item @click.stop="menuActive = false">
            <v-icon start>mdi-close</v-icon>
            <span>{{ $t('global.close') }}</span>
          </v-list-item>
        </v-list>
      </v-menu>
    </td>
    <!-- Render all other columns except actions -->
    <template v-for="col in columns.filter(x => x.kind !== '1:m' && x.kind !== 'm:n' && x.kind !== 'n:m')" :key="col.key ?? ''">
      <td v-if="col.key !== '__actions'">
        <!-- Expansion panel for m:1 columns (object value) -->
        <div v-if="['m:1'].includes(col.kind || '') && isObject(item[col.key || ''])">
          <v-expansion-panels>
            <v-expansion-panel>
              <v-expansion-panel-title>
                {{ $t('global.details') }}
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <table style="width:100%;">
                  <tbody>
                    <tr v-for="(value, key) in item[col.key || '']" :key="key">
                      <td style="font-weight:bold; width:40%;">
                        {{ $t(String(`${col.key}.${key}`)) }}
                      </td>
                      <td>
                        {{ formatValue(String(value), undefined) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
        <div v-else-if="typeof item[col.key || ''] === 'boolean'">
          <v-checkbox :model-value="item[col.key || '']" :disabled="true" hide-details/>
        </div>
        <div v-else>
          {{ formatValue(String(item[col.key || ''] ?? ''), (col as { type?: string }).type) }}
        </div>
      </td>
    </template>
  </tr>
</template>

<script lang="ts" setup>

// #region Imports
import type { EntityItem } from '@/entity/entity';
import { defineProps, ref } from 'vue';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import '@/assets/styles/SaplingEntityRow.css';
import { isObject } from 'vuetify/lib/util/helpers.mjs';
import { useSaplingTableRow } from '@/composables/table/useSaplingTableRow';
// #endregion

// #region Props and Emits
interface SaplingEntityRowProps {
  item: Record<string, unknown>;
  columns: EntityTemplate[];
  index: number;
  selectedRow: number | null;
  entityName: string,
  entity: EntityItem | null,
  entityPermission: AccumulatedPermission | null,
  entityTemplates: EntityTemplate[],
  showActions: boolean;
}
const props = defineProps<SaplingEntityRowProps>();

defineEmits(['select-row', 'edit', 'delete']);
// #endregion

// #region Constants and Refs
const menuRef = ref();
const menuActive = ref(false);
// #endregion

// #region Composable
const { formatValue } = useSaplingTableRow(
  props.entityName, 
  props.entity, 
  props.entityPermission, 
  props.entityTemplates
);
// #endregion

</script>