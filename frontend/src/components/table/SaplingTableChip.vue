<template>
  <div>
    <template v-if="references[col.referenceName ?? '']?.entityStates">
      <template v-if="references[col.referenceName ?? '']?.entityStates?.get(col.referenceName ?? '')?.entityTemplates">
        <template v-for="refTemplates in [references[col.referenceName ?? '']?.entityStates?.get(col.referenceName ?? '')?.entityTemplates]">
          <template v-if="refTemplates?.length">
            <template v-for="compact in (refTemplates?.filter(t => t.options?.includes('isShowInCompact')).slice(0,1) || [])" :key="compact.name">
              <v-chip
                :color="getChipColor(refTemplates, item, col)"
                small>
                <template v-if="hasChipIcon(refTemplates, item, col)">
                  <v-icon small class="mr-2">
                    {{ getChipIcon(refTemplates, item, col) }}
                  </v-icon>
                </template>
                {{ item[col.key]?.[compact.name] }}
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
import type { EntityTemplate } from '@/entity/structure';

defineProps<{ item: any, col: EntityTemplate, references: any }>();
const { getChipColor, hasChipIcon, getChipIcon } = useSaplingTableChip();
</script>
