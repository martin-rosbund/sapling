<template>
  <section class="sapling-permission-workspace glass-panel">
    <div class="sapling-permission-toolbar">
      <v-tabs v-model="selectedGroupModel" class="sapling-permission-tabs" show-arrows>
        <v-tab
          v-for="group in permissionGroups"
          :key="group"
          :value="group"
          class="sapling-permission-tab"
        >
          {{ $t(`navigationGroup.${group}`) }}
        </v-tab>
      </v-tabs>

      <div class="sapling-permission-toolbar-actions">
        <v-text-field
          v-model="permissionSearchModel"
          :label="$t('global.search')"
          density="comfortable"
          hide-details
          rounded="lg"
          prepend-inner-icon="mdi-filter-variant"
        />

        <v-btn-toggle
          v-model="permissionFilterModeModel"
          color="primary"
          density="comfortable"
          mandatory
        >
          <v-btn value="all" variant="outlined">{{ $t('right.all') }}</v-btn>
          <v-btn value="enabled" variant="outlined">{{ $t('right.enabled') }}</v-btn>
          <v-btn value="disabled" variant="outlined">{{ $t('right.disabled') }}</v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <v-progress-linear
      v-if="permissionSaveState === 'saving'"
      color="primary"
      indeterminate
      class="sapling-permission-progress"
    />

    <div v-if="entities.length && lgAndUp" class="sapling-permission-matrix-shell">
      <v-table class="sapling-permission-matrix" density="comfortable">
        <thead>
          <tr>
            <th>{{ $t('navigation.entity') }}</th>
            <th v-for="column in permissionColumns" :key="column.key">{{ $t(column.labelKey) }}</th>
            <th class="text-right">{{ $t('right.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in entities" :key="item.handle" :class="rowClasses(item)">
            <td>
              <div class="sapling-permission-entity-cell">
                <div class="sapling-permission-entity-main">
                  <v-icon v-if="item.icon" size="18">{{ item.icon }}</v-icon>
                  <span>{{ $t(`navigation.${item.handle}`) }}</span>
                </div>
                <div class="sapling-permission-entity-tags">
                  <v-chip
                    v-if="isPermissionDirty(selectedRole, item)"
                    size="x-small"
                    color="warning"
                    variant="tonal"
                    >{{ $t('right.dirty') }}</v-chip
                  >
                  <v-chip
                    v-if="isPermissionPending(selectedRole, item)"
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    >{{ $t('right.saving') }}</v-chip
                  >
                </div>
              </div>
            </td>

            <td
              v-for="column in permissionColumns"
              :key="`${item.handle}-${column.key}`"
              class="text-center"
            >
              <v-checkbox
                v-if="canUsePermission(item, column.key)"
                :model-value="getPermission(selectedRole, item, column.key)"
                hide-details
                density="compact"
                :ripple="false"
                @update:model-value="emit('togglePermission', item, column.key, !!$event)"
              />
              <span v-else class="sapling-permission-unavailable">-</span>
            </td>

            <td class="text-right">
              <div class="sapling-permission-row-actions">
                <v-btn size="x-small" variant="text" @click="emit('grantEntityAccess', item)">{{
                  $t('right.all')
                }}</v-btn>
                <v-btn size="x-small" variant="text" @click="emit('clearEntityAccess', item)">{{
                  $t('right.none')
                }}</v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div v-else-if="entities.length" class="sapling-permission-mobile-list">
      <article
        v-for="item in entities"
        :key="`mobile-${item.handle}`"
        class="sapling-permission-mobile-card glass-panel"
        :class="rowClasses(item)"
      >
        <div class="sapling-permission-mobile-card-header">
          <div class="sapling-permission-entity-main">
            <v-icon v-if="item.icon" size="18">{{ item.icon }}</v-icon>
            <span>{{ $t(`navigation.${item.handle}`) }}</span>
          </div>
          <div class="sapling-permission-row-actions">
            <v-btn size="x-small" variant="text" @click="emit('grantEntityAccess', item)">{{
              $t('right.all')
            }}</v-btn>
            <v-btn size="x-small" variant="text" @click="emit('clearEntityAccess', item)">{{
              $t('right.none')
            }}</v-btn>
          </div>
        </div>

        <div class="sapling-permission-mobile-grid">
          <div
            v-for="column in permissionColumns"
            :key="`mobile-${item.handle}-${column.key}`"
            class="sapling-permission-mobile-grid-row"
          >
            <span>{{ $t(column.labelKey) }}</span>
            <v-checkbox
              v-if="canUsePermission(item, column.key)"
              :model-value="getPermission(selectedRole, item, column.key)"
              hide-details
              density="compact"
              :ripple="false"
              @update:model-value="emit('togglePermission', item, column.key, !!$event)"
            />
            <span v-else class="sapling-permission-unavailable">-</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="sapling-permission-empty-state">
      {{ $t('permission.noEntitiesForFilters') }}
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import type { EntityItem, RoleItem } from '@/entity/entity'

type PermissionColumnKey = 'allowShow' | 'allowRead' | 'allowInsert' | 'allowUpdate' | 'allowDelete'
type PermissionFilterMode = 'all' | 'enabled' | 'disabled'

const permissionColumns = [
  { key: 'allowShow', labelKey: 'right.canShow' },
  { key: 'allowRead', labelKey: 'right.canRead' },
  { key: 'allowInsert', labelKey: 'right.canInsert' },
  { key: 'allowUpdate', labelKey: 'right.canUpdate' },
  { key: 'allowDelete', labelKey: 'right.canDelete' },
] as const satisfies ReadonlyArray<{ key: PermissionColumnKey; labelKey: string }>

const props = defineProps<{
  selectedRole: RoleItem
  selectedGroup: string | null
  permissionGroups: string[]
  permissionSearch: string
  permissionFilterMode: PermissionFilterMode
  permissionSaveState: string
  entities: EntityItem[]
  canUsePermission: (item: EntityItem, permissionType: PermissionColumnKey) => boolean
  getPermission: (role: RoleItem, item: EntityItem, permissionType: PermissionColumnKey) => boolean
  isPermissionDirty: (role: RoleItem, item: EntityItem) => boolean
  isPermissionPending: (role: RoleItem, item: EntityItem) => boolean
}>()

const emit = defineEmits<{
  (event: 'update:selectedGroup', value: string | null): void
  (event: 'update:permissionSearch', value: string): void
  (event: 'update:permissionFilterMode', value: PermissionFilterMode): void
  (
    event: 'togglePermission',
    item: EntityItem,
    permissionType: PermissionColumnKey,
    value: boolean,
  ): void
  (event: 'grantEntityAccess', item: EntityItem): void
  (event: 'clearEntityAccess', item: EntityItem): void
}>()

const { lgAndUp } = useDisplay()

const selectedGroupModel = computed({
  get: () => props.selectedGroup,
  set: (value: string | null) => emit('update:selectedGroup', value),
})

const permissionSearchModel = computed({
  get: () => props.permissionSearch,
  set: (value: string) => emit('update:permissionSearch', value),
})

const permissionFilterModeModel = computed({
  get: () => props.permissionFilterMode,
  set: (value: PermissionFilterMode) => emit('update:permissionFilterMode', value),
})

function rowClasses(item: EntityItem) {
  return {
    'sapling-permission-row-dirty': props.isPermissionDirty(props.selectedRole, item),
    'sapling-permission-row-pending': props.isPermissionPending(props.selectedRole, item),
  }
}
</script>
