<template>
  <tr :class="{ 'selected-row': selectedRow === index }" style="cursor: pointer;">
    <td v-if="showActions" class="actions-cell">
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-dots-vertical" size="small" class="glass-panel" @click.stop></v-btn>
        </template>
        <v-list class="glass-panel" >
          <template v-if="entity?.canUpdate && (entityPermission?.allowUpdate)">
            <v-list-item @click.stop="$emit('edit', ticket)">
              <v-icon start>mdi-pencil</v-icon>
              <span>{{ $t('global.edit') }}</span>
            </v-list-item>
          </template>
          <template v-if="entity?.canDelete && (entityPermission?.allowDelete)">
            <v-list-item @click.stop="$emit('delete', ticket)">
              <v-icon start>mdi-delete</v-icon>
              <span>{{ $t('global.delete') }}</span>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>
    </td>
    <td v-for="(col, idx) in headers.filter(h => h.key !== '__actions')" :key="col.key ?? idx">
      <template v-if="col.key === 'status'">
        <v-chip :color="ticket?.status?.color" small>{{ ticket?.status?.description }}</v-chip>
      </template>
      <template v-else-if="col.key === 'assignee'">
        <v-icon left small>mdi-account</v-icon>
        {{ ticket?.assignee ? (ticket.assignee.firstName + ' ' + ticket.assignee.lastName) : '' }}
      </template>
      <template v-else-if="col.key === 'creator'">
        <v-icon left small>mdi-account</v-icon>
        {{ ticket?.creator ? (ticket.creator.firstName + ' ' + ticket.creator.lastName) : '' }}
      </template>
      <template v-else-if="col.key === 'company'">
        <v-icon left small>mdi-domain</v-icon>
        {{ ticket?.assignee && ticket.assignee.company ? ticket.assignee.company.name : '' }}
      </template>
      <template v-else-if="col.key === 'priority'">
        <v-chip v-if="ticket?.priority" :color="ticket.priority.color" small>{{ ticket.priority.description }}</v-chip>
      </template>
      <template v-else-if="col.key === 'startDate'">
        <span v-if="ticket?.startDate">{{ formatDateTime(ticket.startDate) }}</span>
      </template>
      <template v-else-if="col.key === 'endDate'">
        <span v-if="ticket?.endDate">{{ formatDateTime(ticket.endDate) }}</span>
      </template>
      <template v-else-if="col.key === 'deadlineDate'">
        <span v-if="ticket?.deadlineDate">{{ formatDateTime(ticket.deadlineDate) }}</span>
      </template>
      <template v-else>
        {{ col.key && col.key in ticket ? (ticket as Record<string, any>)[col.key] : '' }}
      </template>
    </td>
    <td class="expand-cell">
      <v-btn icon size="small" class="glass-panel" @click.stop="$emit('expand', ticket.handle)">
        <v-icon>{{ expandedRow === String(ticket.handle) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </v-btn>
    </td>
  </tr>
  <!-- Expanded row for problem/solution description -->
  <tr v-if="expandedRow === String(ticket.handle)">
    <td :colspan="headers.length + (showActions ? 1 : 0)">
      <div v-if="ticket?.problemDescription" class="sapling-ticket-problem-description">
        <v-card outlined class="sapling-ticket-problem-card mb-2 pa-2">
          <v-card-title class="sapling-ticket-problem-title pa-1 pb-0">
            <v-icon left color="error" size="18">mdi-alert-circle</v-icon>
            {{ $t('ticket.problemDescription') }}
          </v-card-title>
          <v-card-text class="sapling-ticket-description-preline pa-2">
            <div v-html="formatRichText(ticket.problemDescription)"></div>
          </v-card-text>
        </v-card>
      </div>
      <div v-if="ticket?.solutionDescription">
        <v-card outlined class="sapling-ticket-solution-card pa-2">
          <v-card-title class="sapling-ticket-solution-title pa-1 pb-0">
            <v-icon left color="success" size="18">mdi-lightbulb-on</v-icon>
            {{ $t('ticket.solutionDescription') }}
          </v-card-title>
          <v-card-text class="sapling-ticket-description-preline pa-2">
            <div v-html="formatRichText(ticket.solutionDescription)"></div>
          </v-card-text>
        </v-card>
      </div>
    </td>
  </tr>
</template>

<script lang="ts" setup>
import type { EntityItem, TicketItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import { defineProps, defineEmits, type Ref } from 'vue';
import type { InternalDataTableHeader } from 'vuetify/lib/components/VDataTable/types.mjs';
const props = defineProps<{
  ticket: TicketItem,
  entity: EntityItem | null,
  headers: InternalDataTableHeader[],
  index: number,
  selectedRow: number | null,
  expandedRow: string | null | undefined,
  showActions?: boolean,
  entityPermission?: AccumulatedPermission | null,
  formatRichText: (text: string | undefined | null) => string,
  formatDateTime: (date: string | Date) => string,
}>();
const emit = defineEmits(['expand', 'edit', 'delete']);
const showActions = props.showActions !== false;
</script>
