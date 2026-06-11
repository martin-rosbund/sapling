<template>
  <section class="sapling-crm-workspace-list glass-panel">
    <header class="sapling-crm-workspace-list__header">
      <h3>{{ title }}</h3>
      <span class="sapling-crm-workspace-list__count">{{ items.length }}</span>
    </header>

    <div v-if="items.length === 0" class="sapling-crm-workspace-list__empty">
      <v-icon :icon="emptyIcon" size="30" />
      <span>{{ emptyText }}</span>
    </div>

    <div v-else class="sapling-crm-workspace-list__items">
      <button
        v-for="item in items"
        :key="item.id"
        class="sapling-crm-workspace-list-card"
        :class="`sapling-crm-workspace-list-card--${item.tone ?? 'default'}`"
        type="button"
        @click="emit('open', item)"
      >
        <span class="sapling-crm-workspace-list-card__icon">
          <v-icon :icon="item.icon ?? 'mdi-arrow-right-circle-outline'" size="18" />
        </span>

        <span class="sapling-crm-workspace-list-card__copy">
          <strong>{{ item.title }}</strong>
          <span>{{ item.subtitle }}</span>
          <span v-if="item.owner" class="sapling-crm-workspace-list-card__owner">
            <v-icon icon="mdi-account-tie-outline" size="14" />
            {{ item.owner }}
          </span>
        </span>

        <span class="sapling-crm-workspace-list-card__meta">
          <span v-if="item.badge" class="sapling-crm-workspace-list-card__badge">
            {{ item.badge }}
          </span>
          <span v-if="item.value" class="sapling-crm-workspace-list-card__value">
            {{ item.value }}
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
export interface CrmWorkspaceItem {
  id: string
  entity: 'company' | 'person' | 'salesOpportunity'
  handle: string | number | null | undefined
  title: string
  subtitle: string
  value?: string
  badge?: string
  owner?: string
  tone?: 'default' | 'info' | 'success' | 'warning' | 'error'
  icon?: string
}

defineProps<{
  title: string
  items: CrmWorkspaceItem[]
  emptyIcon: string
  emptyText: string
}>()

const emit = defineEmits<{
  open: [item: CrmWorkspaceItem]
}>()
</script>
