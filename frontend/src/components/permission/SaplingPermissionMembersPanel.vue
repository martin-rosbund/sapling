<template>
  <aside class="sapling-permission-context">
    <section class="sapling-permission-members glass-panel">
      <div class="sapling-permission-panel-header">
        <div>
          <p class="sapling-permission-section-eyebrow">{{ $t('role.persons') }}</p>
          <h2 class="sapling-permission-section-title">{{ $t('role.membersTitle') }}</h2>
        </div>
      </div>

      <SaplingFieldSelectAdd
        :label="$t('global.add')"
        entityHandle="person"
        :modelValue="[]"
        :items="availablePersons"
        :disabled="!selectedRole || membersArePending"
        class="sapling-permission-member-add"
        @add-selected="emit('addPersons', $event)"
      />

      <div v-if="selectedRoleMembers.length" class="sapling-permission-member-list">
        <article
          v-for="person in selectedRoleMembers"
          :key="person.handle ?? `${person.firstName}-${person.lastName}`"
          class="sapling-permission-member-card"
        >
          <div>
            <strong>{{ person.firstName }} {{ person.lastName }}</strong>
            <p>{{ person.email || person.loginName || $t('role.noContactData') }}</p>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            :disabled="membersArePending || !selectedRole"
            @click="selectedRole ? emit('removePerson', person) : undefined"
          />
        </article>
      </div>
      <div v-else class="sapling-permission-empty-block">
        {{ $t('role.noMembersAssigned') }}
      </div>
    </section>
  </aside>
</template>

<script lang="ts" setup>
import type { PersonItem, RoleItem } from '@/entity/entity'
import SaplingFieldSelectAdd from '@/components/dialog/fields/SaplingFieldSelectAdd.vue'

defineProps<{
  selectedRole: RoleItem | null
  membersArePending: boolean
  availablePersons: PersonItem[]
  selectedRoleMembers: PersonItem[]
}>()

const emit = defineEmits<{
  (event: 'addPersons', persons: PersonItem[]): void
  (event: 'removePerson', person: PersonItem): void
}>()
</script>
