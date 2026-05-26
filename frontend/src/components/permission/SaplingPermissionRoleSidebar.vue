<template>
  <aside
    class="sapling-section-panel sapling-page-panel sapling-page-panel-stack sapling-admin-sidebar sapling-admin-panel-stack sapling-permission-sidebar glass-panel"
  >
    <div class="sapling-stack-md sapling-admin-panel-header sapling-permission-panel-header">
      <div>
        <p class="sapling-eyebrow sapling-admin-section-eyebrow sapling-permission-section-eyebrow">
          {{ $t('navigation.role') }}
        </p>
        <h2 class="sapling-section-title">{{ $t('role.directory') }}</h2>
      </div>
      <v-text-field
        v-model="roleSearchModel"
        :label="$t('global.search')"
        density="comfortable"
        hide-details
        rounded="lg"
        prepend-inner-icon="mdi-magnify"
      />
    </div>

    <v-list
      class="sapling-scroll-list sapling-admin-list sapling-permission-role-list"
      density="comfortable"
      nav
    >
      <v-list-item
        v-for="role in roles"
        :key="role.handle ?? role.title"
        :active="selectedRoleHandle === role.handle"
        class="sapling-admin-list-item sapling-permission-role-item"
        @click="emit('selectRole', role.handle ?? null)"
      >
        <template #prepend>
          <div class="sapling-admin-avatar sapling-permission-role-avatar">
            {{ getRoleInitial(role.title) }}
          </div>
        </template>

        <v-list-item-title>{{ role.title }}</v-list-item-title>
        <v-list-item-subtitle>{{ getStageTitle(role.stage) }}</v-list-item-subtitle>

        <template #append>
          <div class="sapling-row-xs sapling-admin-list-meta sapling-permission-role-meta">
            <v-chip size="x-small" variant="outlined">
              {{ getRoleMemberCount(role) }}
            </v-chip>
            <v-badge v-if="isRoleDirty(role)" dot color="warning" inline />
          </div>
        </template>
      </v-list-item>
    </v-list>

    <div
      v-if="!roles.length"
      class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-admin-empty-block sapling-permission-empty-block"
    >
      {{ $t('role.noRolesMatchSearch') }}
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { RoleItem } from '@/entity/entity'

const props = defineProps<{
  roles: RoleItem[]
  selectedRoleHandle: RoleItem['handle']
  roleSearch: string
  getStageTitle: (stage: RoleItem['stage']) => string
  getRoleInitial: (title: string) => string
  getRoleMemberCount: (role: RoleItem) => string | number
  isRoleDirty: (role: RoleItem) => boolean
}>()

const emit = defineEmits<{
  (event: 'update:roleSearch', value: string): void
  (event: 'selectRole', handle: RoleItem['handle']): void
}>()

const roleSearchModel = computed({
  get: () => props.roleSearch,
  set: (value: string) => emit('update:roleSearch', value),
})
</script>
