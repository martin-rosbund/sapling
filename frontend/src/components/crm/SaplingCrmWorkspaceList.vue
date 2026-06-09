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

<style scoped>
.sapling-crm-workspace-list {
  --crm-list-border: rgba(255, 255, 255, 0.13);
  --crm-list-muted: rgba(229, 236, 255, 0.7);
  --crm-list-panel: rgba(15, 22, 38, 0.64);

  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 8px;
  background: var(--crm-list-panel);
}

.sapling-crm-workspace-list__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.sapling-crm-workspace-list__header h3 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.25;
}

.sapling-crm-workspace-list__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding-inline: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.sapling-crm-workspace-list__items {
  display: grid;
  gap: 10px;
}

.sapling-crm-workspace-list-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) minmax(96px, auto);
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  border: 1px solid var(--crm-list-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.sapling-crm-workspace-list-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.45);
  background: rgba(var(--v-theme-primary), 0.1);
}

.sapling-crm-workspace-list-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(229, 236, 255, 0.9);
}

.sapling-crm-workspace-list-card__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.sapling-crm-workspace-list-card__copy strong,
.sapling-crm-workspace-list-card__copy span {
  min-width: 0;
  overflow: hidden;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sapling-crm-workspace-list-card__copy span {
  color: var(--crm-list-muted);
}

.sapling-crm-workspace-list-card__meta {
  display: grid;
  gap: 4px;
  justify-items: end;
  min-width: 0;
}

.sapling-crm-workspace-list-card__badge,
.sapling-crm-workspace-list-card__value {
  max-width: 150px;
  overflow: hidden;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sapling-crm-workspace-list-card__badge {
  font-size: 0.74rem;
  color: var(--crm-list-muted);
}

.sapling-crm-workspace-list-card__value {
  font-weight: 700;
}

.sapling-crm-workspace-list-card--warning .sapling-crm-workspace-list-card__icon {
  color: rgb(var(--v-theme-warning));
}

.sapling-crm-workspace-list-card--error .sapling-crm-workspace-list-card__icon {
  color: rgb(var(--v-theme-error));
}

.sapling-crm-workspace-list-card--info .sapling-crm-workspace-list-card__icon {
  color: rgb(var(--v-theme-info));
}

.sapling-crm-workspace-list-card--success .sapling-crm-workspace-list-card__icon {
  color: rgb(var(--v-theme-success));
}

.sapling-crm-workspace-list__empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 28px 12px;
  color: var(--crm-list-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .sapling-crm-workspace-list-card {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .sapling-crm-workspace-list-card__meta {
    grid-column: 2;
    justify-items: start;
  }

  .sapling-crm-workspace-list-card__badge,
  .sapling-crm-workspace-list-card__value {
    max-width: 100%;
  }
}
</style>
