<template>
  <aside
    class="sapling-stack-xl sapling-page-panel sapling-admin-context sapling-permission-context"
  >
    <section
      class="sapling-section-panel sapling-page-panel sapling-admin-members sapling-permission-members glass-panel"
    >
      <div class="sapling-stack-md sapling-admin-panel-header sapling-permission-panel-header">
        <div>
          <p
            class="sapling-eyebrow sapling-admin-section-eyebrow sapling-permission-section-eyebrow"
          >
            {{ $t('role.persons') }}
          </p>
          <h2 class="sapling-section-title">{{ $t('role.membersTitle') }}</h2>
        </div>
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-account-multiple-plus-outline"
          :disabled="!selectedRole || membersArePending"
          @click="emit('importProviderUsers')"
        >
          {{ $t('providerUserImport.open') }}
        </v-btn>
      </div>

      <SaplingFieldSelectAdd
        :label="$t('global.add')"
        entityHandle="person"
        :modelValue="[]"
        :items="availablePersons"
        :disabled="!selectedRole || membersArePending"
        class="sapling-admin-member-add sapling-permission-member-add"
        @add-selected="emit('addPersons', $event)"
      />

      <div
        v-if="selectedRoleMembers.length"
        class="sapling-scroll-list sapling-admin-member-list sapling-permission-member-list"
      >
        <article
          v-for="person in selectedRoleMembers"
          :key="person.handle ?? `${person.firstName}-${person.lastName}`"
          class="sapling-panel-shell sapling-row-between-xs sapling-admin-member-card sapling-permission-member-card"
        >
          <div class="sapling-admin-member-card__copy sapling-permission-member-card__copy">
            <strong>{{ person.firstName }} {{ person.lastName }}</strong>
            <p>{{ person.email || person.loginName || $t('role.noContactData') }}</p>
          </div>
          <div
            class="sapling-row-xs sapling-admin-member-card__actions sapling-permission-member-card__actions"
          >
            <v-tooltip location="bottom">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-eye-outline"
                  variant="text"
                  size="small"
                  density="comfortable"
                  :loading="impersonatingHandle === person.handle"
                  :disabled="impersonationPending || !canImpersonatePerson(person)"
                  @click="onImpersonate(person)"
                />
              </template>
              {{ $t('permission.impersonationViewAs') }}
            </v-tooltip>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              density="comfortable"
              :disabled="membersArePending || !selectedRole"
              @click="selectedRole ? emit('removePerson', person) : undefined"
            />
          </div>
        </article>
      </div>
      <div
        v-else
        class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-admin-empty-block sapling-permission-empty-block"
      >
        {{ $t('role.noMembersAssigned') }}
      </div>
    </section>
  </aside>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PersonItem, RoleItem } from '@/entity/entity'
import SaplingFieldSelectAdd from '@/components/dialog/fields/SaplingFieldSelectAdd.vue'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'

defineProps<{
  selectedRole: RoleItem | null
  membersArePending: boolean
  availablePersons: PersonItem[]
  selectedRoleMembers: PersonItem[]
}>()

const emit = defineEmits<{
  (event: 'addPersons', persons: PersonItem[]): void
  (event: 'removePerson', person: PersonItem): void
  (event: 'importProviderUsers'): void
}>()

const currentPersonStore = useCurrentPersonStore()
const impersonatingHandle = ref<number | null>(null)
const impersonationPending = computed(() => impersonatingHandle.value !== null)

const isAdministrator = computed(
  () =>
    currentPersonStore.person?.roles?.some(
      (role) => typeof role !== 'string' && role?.isAdministrator === true,
    ) ?? false,
)

function canImpersonatePerson(person: PersonItem): boolean {
  if (!isAdministrator.value) return false
  if (currentPersonStore.isImpersonating) return false
  if (typeof person.handle !== 'number') return false
  if (person.handle === currentPersonStore.person?.handle) return false
  if (person.isActive === false) return false
  return true
}

async function onImpersonate(person: PersonItem) {
  if (!canImpersonatePerson(person) || typeof person.handle !== 'number') {
    return
  }
  impersonatingHandle.value = person.handle
  try {
    await currentPersonStore.startImpersonation(person.handle)
  } catch {
    impersonatingHandle.value = null
  }
}
</script>
