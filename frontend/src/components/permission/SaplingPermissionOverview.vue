<template>
  <div v-if="selectedRole" class="sapling-admin-overview-row sapling-permission-overview-row">
    <section class="sapling-section-panel sapling-page-panel sapling-admin-selection sapling-permission-selection glass-panel">
      <div>
        <p class="sapling-eyebrow sapling-admin-section-eyebrow sapling-permission-section-eyebrow">
          {{ $t('role.selectedRole') }}
        </p>
        <h2 class="sapling-section-title">{{ selectedRole.title }}</h2>
        <div class="sapling-chip-row sapling-admin-selection__meta sapling-permission-selection-meta">
          <v-chip size="small" color="primary" variant="tonal">
            {{ getStageTitle(selectedRole.stage) }}
          </v-chip>
          <v-chip size="small" variant="outlined">
            {{ selectedRoleStats.memberCount }} {{ $t('role.persons') }}
          </v-chip>
          <v-chip size="small" variant="outlined">
            {{ selectedRoleStats.enabledPermissionCount }} {{ $t('right.enabled') }}
          </v-chip>
          <v-chip
            v-if="selectedRoleStats.dirtyEntityCount"
            size="small"
            color="warning"
            variant="tonal"
          >
            {{ selectedRoleStats.dirtyEntityCount }} {{ $t('permission.changedEntities') }}
          </v-chip>
        </div>
      </div>

      <div class="sapling-admin-selection__status sapling-permission-selection-status">
        <v-alert
          v-if="permissionSaveState === 'error' && permissionSaveError"
          type="error"
          density="comfortable"
          variant="tonal"
        >
          {{ permissionSaveError }}
        </v-alert>
        <v-alert
          v-else-if="permissionSaveState === 'saved'"
          type="success"
          density="comfortable"
          variant="tonal"
        >
          {{ $t('permission.savedSuccessfully') }}
        </v-alert>
        <v-alert
          v-else-if="hasUnsavedPermissionChanges"
          type="warning"
          density="comfortable"
          variant="tonal"
        >
          {{ $t('permission.reviewStagedChanges') }}
        </v-alert>
      </div>
    </section>

    <section class="sapling-section-panel sapling-page-panel sapling-page-panel-stack sapling-admin-panel-stack sapling-admin-summary sapling-permission-summary glass-panel">
      <div class="sapling-stack-md sapling-permission-summary-header">
        <p class="sapling-eyebrow sapling-admin-section-eyebrow sapling-permission-section-eyebrow">
          {{ $t('permission.workingSet') }}
        </p>
        <h2 class="sapling-section-title">{{ $t('permission.changeSummary') }}</h2>
      </div>

      <div class="sapling-admin-summary-grid sapling-permission-summary-grid">
        <article class="sapling-panel-shell sapling-stack-md sapling-admin-summary-card sapling-permission-summary-card">
          <span>{{ $t('right.currentGroup') }}</span>
          <strong>{{
            selectedGroup ? $t(`navigationGroup.${selectedGroup}`) : $t('roleStage.none')
          }}</strong>
        </article>
        <article class="sapling-panel-shell sapling-stack-md sapling-admin-summary-card sapling-permission-summary-card">
          <span>{{ $t('permission.visibleEntities') }}</span>
          <strong>{{ visibleEntityCount }}</strong>
        </article>
        <article class="sapling-panel-shell sapling-stack-md sapling-admin-summary-card sapling-permission-summary-card">
          <span>{{ $t('permission.dirtyEntities') }}</span>
          <strong>{{ selectedRoleStats.dirtyEntityCount }}</strong>
        </article>
        <article class="sapling-panel-shell sapling-stack-md sapling-admin-summary-card sapling-permission-summary-card">
          <span>{{ $t('permission.saveMode') }}</span>
          <strong>{{ $t('right.manual') }}</strong>
        </article>
      </div>

      <p class="sapling-admin-summary-note sapling-permission-summary-note">
        {{ $t('permission.summaryNote') }}
      </p>
    </section>
  </div>
</template>

<script lang="ts" setup>
import type { RoleItem } from '@/entity/entity'

defineProps<{
  selectedRole: RoleItem | null
  selectedRoleStats: {
    memberCount: number
    enabledPermissionCount: number
    dirtyEntityCount: number
  }
  selectedGroup: string | null
  visibleEntityCount: number
  permissionSaveState: string
  permissionSaveError?: string | null
  hasUnsavedPermissionChanges: boolean
  getStageTitle: (stage: RoleItem['stage']) => string
}>()
</script>
