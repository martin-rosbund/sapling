<template>
  <SaplingSurface class="sapling-panel-shell sapling-section-panel sapling-import__panel">
    <div class="sapling-import__summary">
      <v-chip color="success" variant="tonal" prepend-icon="mdi-check">
        {{ batch?.readyCount ?? 0 }} {{ t('import.readyRows') }}
      </v-chip>
      <v-chip color="warning" variant="tonal" prepend-icon="mdi-alert">
        {{ batch?.errorCount ?? 0 }} {{ t('import.errorRows') }}
      </v-chip>
      <v-chip variant="outlined" prepend-icon="mdi-plus-circle-outline">
        {{ batch?.createdCount ?? 0 }} {{ t('import.createdRows') }}
      </v-chip>
      <v-chip variant="outlined" prepend-icon="mdi-pencil-outline">
        {{ batch?.updatedCount ?? 0 }} {{ t('import.updatedRows') }}
      </v-chip>
    </div>

    <div class="sapling-import__preview-scroll">
      <v-alert
        v-if="isPreviewLimited"
        density="compact"
        type="info"
        variant="tonal"
        class="sapling-import__preview-note"
      >
        {{
          t('import.previewLimited', {
            count: previewRowLimit,
            total: batch?.rowCount ?? batch?.rows.length ?? 0,
          })
        }}
      </v-alert>

      <div v-if="saplingPreviewItems.length > 0" class="sapling-import__sapling-preview">
        <div class="sapling-section-header">
          <div>
            <p class="sapling-eyebrow">{{ t('import.saplingPreview') }}</p>
            <h2 class="sapling-section-title">{{ entityPreviewTitle }}</h2>
          </div>
        </div>
        <SaplingTable
          :items="saplingPreviewItems"
          search=""
          :page="1"
          :items-per-page="3"
          :total-items="saplingPreviewItems.length"
          :is-loading="false"
          :sort-by="[]"
          :column-filters="{}"
          :entity-handle="selectedEntityHandle ?? ''"
          :entity="selectedEntity"
          :entity-permission="selectedEntityPermission"
          :entity-templates="selectedEntityTemplates"
          :show-actions="false"
          :show-add="false"
          :show-favorite="false"
          :show-import="false"
          :show-form-config="false"
          :show-search="false"
          :show-toolbar="false"
          :row-interaction="false"
          :table-key="`import-preview-${selectedEntityHandle ?? 'none'}-${batch?.handle ?? 'new'}`"
          disable-mobile-view
          @update:search="noop"
          @update:page="noop"
          @update:items-per-page="noop"
          @update:sort-by="noop"
          @update:column-filters="noop"
          @reload="noop"
          @update:selected="noop"
        />
      </div>

      <v-table v-if="previewRows.length > 0" density="compact" class="sapling-import__table">
        <thead>
          <tr>
            <th>{{ t('importBatchRow.rowNumber') }}</th>
            <th>{{ t('importBatchRow.status') }}</th>
            <th>{{ t('importBatchRow.action') }}</th>
            <th>{{ t('importBatchRow.targetReference') }}</th>
            <th>{{ t('importBatchRow.message') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in previewRows" :key="row.rowNumber">
            <td>{{ row.rowNumber }}</td>
            <td>
              <v-chip size="small" :color="row.status === 'error' ? 'warning' : 'primary'">
                {{ importStatusLabel(row.status) }}
              </v-chip>
            </td>
            <td>{{ row.action ? importActionLabel(row.action) : '-' }}</td>
            <td>{{ row.targetReference ?? '-' }}</td>
            <td>{{ importMessageLabel(row.message) }}</td>
          </tr>
        </tbody>
      </v-table>

      <v-table v-else-if="sampleHeaders.length > 0" density="compact" class="sapling-import__table">
        <thead>
          <tr>
            <th v-for="header in sampleHeaders" :key="header">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in batch?.sampleRows ?? []" :key="index">
            <td v-for="header in sampleHeaders" :key="header">
              {{ row[header] ?? '' }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { ImportBatchRowSummary, ImportBatchSummary } from '@/services/api.import.service'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'

defineProps<{
  batch: ImportBatchSummary | null
  isPreviewLimited: boolean
  previewRowLimit: number
  saplingPreviewItems: SaplingGenericItem[]
  entityPreviewTitle: string
  selectedEntityHandle: string | null
  selectedEntity: EntityItem | null
  selectedEntityPermission: AccumulatedPermission | null
  selectedEntityTemplates: EntityTemplate[]
  previewRows: ImportBatchRowSummary[]
  sampleHeaders: string[]
  importStatusLabel: (status: string) => string
  importActionLabel: (action: string) => string
  importMessageLabel: (message: string | null | undefined) => string
}>()

const { t } = useI18n()

function noop(): void {
  // read-only preview table
}
</script>
