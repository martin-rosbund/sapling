<template>
  <div class="sapling-dialog-edit-tab-scroll">
    <div class="sapling-dialog-edit-relation-shell">
      <div class="sapling-dialog-edit-relation-header">
        <div class="sapling-dialog-edit-relation-header__copy">
          <div class="sapling-dialog-edit-relation-header__eyebrow">
            {{ entityLabel }}
          </div>
          <h3 class="sapling-dialog-edit-relation-header__title">
            {{ $t(`${entityHandle}.${template.name}`) }}
          </h3>
        </div>
        <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-link-variant">
          {{ totalItems }}
        </v-chip>
      </div>
      <v-card class="sapling-dialog-edit-relation-card">
        <v-card-text class="sapling-dialog-edit-relation-content">
          <div class="sapling-dialog-edit-relation-actions">
            <div class="sapling-dialog-edit-relation-actions__field">
              <SaplingSelectAddField
                :label="$t('global.add')"
                :entity-handle="template.referenceName ?? ''"
                :model-value="selectedRelations"
                :rules="[]"
                @update:model-value="
                  (val: SaplingGenericItem[]) => emit('update:selected-relations', val)
                "
                @add-selected="emit('add-relation')"
              />
            </div>
            <v-btn-group>
              <v-btn
                icon="mdi-close"
                color="error"
                variant="tonal"
                :disabled="selectedItems.length === 0"
                @click="emit('remove-relation')"
              />
            </v-btn-group>
          </div>

          <div class="sapling-dialog-edit-relation-table">
            <SaplingTable
              :headers="headers"
              :items="items"
              :parent="item"
              :parent-entity="entity"
              :search="search"
              :page="page"
              :items-per-page="itemsPerPage"
              :total-items="totalItems"
              :is-loading="isLoading"
              :sort-by="sortBy"
              :column-filters="columnFilters"
              :entity-handle="template.referenceName ?? ''"
              :entity-templates="entityTemplates"
              :entity="relationEntity"
              :entity-permission="entityPermission"
              :show-actions="true"
              :multi-select="true"
              :show-favorite="false"
              :show-add="true"
              :table-key="template.name"
              :selected="selectedItems"
              @update:selected="(val: SaplingGenericItem[]) => emit('update:selected-items', val)"
              @update:search="(val: string) => emit('update:search', val)"
              @update:page="(val: number) => emit('update:page', val)"
              @update:items-per-page="(val: number) => emit('update:items-per-page', val)"
              @update:sort-by="(val: SortItem[]) => emit('update:sort-by', val)"
              @update:column-filters="
                (val: Record<string, ColumnFilterItem>) => emit('update:column-filters', val)
              "
              @reload="emit('reload')"
            />
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import SaplingSelectAddField from '@/components/dialog/fields/SaplingFieldSelectAdd.vue'
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  EntityTemplate,
  SortItem,
  SaplingTableHeaderItem,
} from '@/entity/structure'

defineProps<{
  template: EntityTemplate
  entityHandle: string
  entityLabel: string
  item: SaplingGenericItem | null
  entity: EntityItem | null
  headers: SaplingTableHeaderItem[]
  items: SaplingGenericItem[]
  search: string
  page: number
  itemsPerPage: number
  totalItems: number
  isLoading: boolean
  sortBy: SortItem[]
  columnFilters: Record<string, ColumnFilterItem>
  entityTemplates: EntityTemplate[]
  relationEntity: EntityItem | null
  entityPermission: AccumulatedPermission | null
  selectedRelations: SaplingGenericItem[]
  selectedItems: SaplingGenericItem[]
}>()

const emit = defineEmits<{
  (event: 'update:selected-relations', value: SaplingGenericItem[]): void
  (event: 'update:selected-items', value: SaplingGenericItem[]): void
  (event: 'add-relation'): void
  (event: 'remove-relation'): void
  (event: 'update:search', value: string): void
  (event: 'update:page', value: number): void
  (event: 'update:items-per-page', value: number): void
  (event: 'update:sort-by', value: SortItem[]): void
  (event: 'update:column-filters', value: Record<string, ColumnFilterItem>): void
  (event: 'reload'): void
}>()
</script>
