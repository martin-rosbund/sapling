<template>
  <div>
    <template v-if="references[col.referenceName]?.entityStates">
      <template v-if="references[col.referenceName]?.entityStates?.get(col.referenceName)?.entityTemplates">
        <template v-for="refTemplates in [references[col.referenceName]?.entityStates?.get(col.referenceName)?.entityTemplates]">
          <template v-if="refTemplates?.length">
            <template v-for="compact in (refTemplates?.filter(t => t.isShowInCompact).slice(0,1) || [])" :key="compact.name">
              <v-chip
                :color="getChipColor(refTemplates, item, col)"
                small>
                {{ item[col.key]?.[compact.name] }}
                <template v-if="hasChipIcon(refTemplates, item, col)">
                  <v-icon small class="ml-2">
                    {{ getChipIcon(refTemplates, item, col) }}
                  </v-icon>
                </template>
              </v-chip>
            </template>
          </template>
        </template>
      </template>
    </template>
    <template v-else>
      <v-skeleton-loader type="chip" class="transparent" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingTableChip } from '@/composables/table/useSaplingTableChip';
import { defineProps } from 'vue';

const props = defineProps<{ item: any, col: any, references: any }>();
const { getChipColor, hasChipIcon, getChipIcon } = useSaplingTableChip();
</script>
