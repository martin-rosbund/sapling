<template>
  <v-dialog v-if="dialog" v-model="dialog" :persistent="isBusy" class="sapling-dialog-large">
    <SaplingDialogCard
      class="sapling-permission-provider-dialog"
      :tilt="false"
      :close="closeDialog"
      :close-disabled="isBusy"
    >
      <SaplingDialogShell
        fill-shell
        body-class="sapling-dialog-fill-body sapling-permission-provider-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            :eyebrow="$t('providerUserImport.eyebrow')"
            :title="$t('providerUserImport.title')"
            :stats="heroStats"
            :stats-columns="3"
            stats-layout="compact"
          />
        </template>

        <template #body>
          <div class="sapling-dialog-fill-content sapling-permission-provider-dialog__content">
            <div class="sapling-split-toolbar sapling-permission-provider-dialog__toolbar">
              <v-btn-toggle
                v-model="provider"
                class="sapling-toolbar-toggle sapling-permission-provider-dialog__provider-toggle"
                color="primary"
                density="comfortable"
                mandatory
                :disabled="isSaving"
              >
                <v-btn value="azure" prepend-icon="mdi-microsoft-azure" variant="tonal">
                  {{ $t('providerUserImport.azure') }}
                </v-btn>
                <v-btn value="google" prepend-icon="mdi-google" variant="tonal">
                  {{ $t('providerUserImport.google') }}
                </v-btn>
              </v-btn-toggle>

              <v-text-field
                v-model="search"
                class="sapling-permission-provider-dialog__search"
                :label="$t('global.search')"
                autocomplete="off"
                density="comfortable"
                hide-details
                name="provider-user-import-search"
                prepend-inner-icon="mdi-magnify"
                spellcheck="false"
                :loading="isLoading"
                :disabled="isSaving"
                @keyup.enter="reloadUsersImmediately"
              />
            </div>

            <div class="sapling-permission-provider-dialog__assignment-grid">
              <SaplingFieldSelect
                v-model="selectedRoles"
                class="sapling-permission-provider-dialog__roles"
                entity-handle="role"
                :label="$t('providerUserImport.defaultRoles')"
                density="comfortable"
                hide-details
                :disabled="isSaving"
              />

              <SaplingFieldSingleSelect
                v-model="selectedCompany"
                class="sapling-permission-provider-dialog__company"
                entity-handle="company"
                :label="$t('person.company')"
                density="comfortable"
                hide-details
                :disabled="isSaving"
              />
            </div>

            <v-alert
              v-if="loadError"
              type="error"
              variant="tonal"
              density="comfortable"
              class="sapling-permission-provider-dialog__alert"
            >
              {{ loadError }}
            </v-alert>

            <div class="sapling-permission-provider-dialog__list sapling-scrollable">
              <v-progress-linear v-if="isLoading" indeterminate color="primary" />

              <v-table v-if="users.length" density="comfortable">
                <thead>
                  <tr>
                    <th class="sapling-permission-provider-dialog__select-cell">
                      <v-checkbox
                        :model-value="allVisibleUsersSelected"
                        hide-details
                        density="compact"
                        :disabled="isBusy"
                        @update:model-value="toggleAllVisibleUsers(!!$event)"
                      />
                    </th>
                    <th>{{ $t('providerUserImport.user') }}</th>
                    <th>{{ $t('person.email') }}</th>
                    <th>{{ $t('person.type') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.id">
                    <td>
                      <v-checkbox
                        :model-value="selectedUserIds.includes(user.id)"
                        hide-details
                        density="compact"
                        :disabled="isBusy"
                        @update:model-value="toggleUser(user.id, !!$event)"
                      />
                    </td>
                    <td>
                      <div class="sapling-permission-provider-dialog__user">
                        <strong>{{ user.displayName }}</strong>
                        <span class="text-medium-emphasis">{{ user.id }}</span>
                      </div>
                    </td>
                    <td>{{ user.email || user.userPrincipalName || '-' }}</td>
                    <td>
                      <v-chip
                        v-if="user.existingPersonHandle"
                        size="small"
                        color="primary"
                        variant="tonal"
                      >
                        {{ $t('providerUserImport.existingPerson') }}
                      </v-chip>
                      <v-chip v-else size="small" variant="outlined">
                        {{ $t('providerUserImport.newPerson') }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div
                v-else-if="!isLoading"
                class="sapling-empty-state-panel sapling-empty-state-panel--compact"
              >
                {{ $t('providerUserImport.noUsers') }}
              </div>
            </div>

            <div class="sapling-row-between-xs sapling-permission-provider-dialog__footer">
              <v-btn
                variant="text"
                prepend-icon="mdi-chevron-down"
                :disabled="!nextPageToken || isBusy"
                :loading="isLoadingMore"
                @click="loadMoreUsers"
              >
                {{ $t('providerUserImport.loadMore') }}
              </v-btn>

              <v-alert
                v-if="importResult"
                type="success"
                variant="tonal"
                density="compact"
                class="sapling-permission-provider-dialog__result"
              >
                {{
                  $t('providerUserImport.result', {
                    created: importResult.created,
                    updated: importResult.updated,
                    failed: importResult.failed,
                  })
                }}
              </v-alert>
            </div>
          </div>
        </template>

        <template #actions>
          <SaplingActionSave
            :cancel="closeDialog"
            :save="saveImport"
            :busy="isBusy"
            :save-disabled="!canSave"
            :save-loading="isSaving"
          />
        </template>
      </SaplingDialogShell>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingFieldSelect from '@/components/dialog/fields/SaplingFieldSelect.vue'
import SaplingFieldSingleSelect from '@/components/dialog/fields/SaplingFieldSingleSelect.vue'
import type { RoleItem, SaplingGenericItem } from '@/entity/entity'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import ApiProviderUsersService, {
  type ProviderUser,
  type ProviderUserImportResponse,
  type ProviderUserProvider,
} from '@/services/api.provider-users.service'
import { i18n } from '@/i18n'

const props = defineProps<{
  modelValue: boolean
  roles: RoleItem[]
  selectedRole: RoleItem | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'imported', result: ProviderUserImportResponse): void
}>()

const currentPersonStore = useCurrentPersonStore()
const provider = ref<ProviderUserProvider>('azure')
const search = ref('')
const users = ref<ProviderUser[]>([])
const selectedUserIds = ref<string[]>([])
const selectedRoles = ref<SaplingGenericItem[]>([])
const selectedCompany = ref<SaplingGenericItem | null>(null)
const nextPageToken = ref<string | null>(null)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const isSaving = ref(false)
const loadError = ref<string | null>(null)
const importResult = ref<ProviderUserImportResponse | null>(null)
let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null
let activeLoadController: AbortController | null = null
let latestLoadRequestId = 0

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const currentProvider = computed<ProviderUserProvider | null>(() => {
  const type = currentPersonStore.person?.type
  const handle = typeof type === 'object' ? type?.handle : type
  return handle === 'azure' || handle === 'google' ? handle : null
})

const isBusy = computed(() => isLoading.value || isLoadingMore.value || isSaving.value)
const selectedRoleHandles = computed(() =>
  selectedRoles.value
    .map((role) => getNumericHandle(role))
    .filter((handle): handle is number => typeof handle === 'number'),
)
const canSave = computed(
  () => selectedUserIds.value.length > 0 && selectedRoleHandles.value.length > 0 && !isBusy.value,
)
const allVisibleUsersSelected = computed(
  () =>
    users.value.length > 0 && users.value.every((user) => selectedUserIds.value.includes(user.id)),
)
const heroStats = computed(() => [
  { label: i18n.global.t('providerUserImport.loaded'), value: users.value.length },
  { label: i18n.global.t('providerUserImport.selected'), value: selectedUserIds.value.length },
  { label: i18n.global.t('providerUserImport.roles'), value: selectedRoleHandles.value.length },
])

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      clearSearchDebounce()
      cancelActiveLoad()
      return
    }

    provider.value = currentProvider.value ?? 'azure'
    selectedRoles.value = props.selectedRole ? [props.selectedRole as SaplingGenericItem] : []
    selectedCompany.value = null
    selectedUserIds.value = []
    importResult.value = null
    void reloadUsers()
  },
  { immediate: true },
)

watch(provider, () => {
  if (props.modelValue) {
    selectedUserIds.value = []
    importResult.value = null
    reloadUsersImmediately()
  }
})

watch(search, () => {
  if (props.modelValue) {
    scheduleReloadUsers()
  }
})

onBeforeUnmount(() => {
  clearSearchDebounce()
  cancelActiveLoad()
})

function scheduleReloadUsers() {
  clearSearchDebounce()
  searchDebounceTimeout = setTimeout(() => {
    void reloadUsers()
  }, 350)
}

function clearSearchDebounce() {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
    searchDebounceTimeout = null
  }
}

function reloadUsersImmediately() {
  clearSearchDebounce()
  void reloadUsers()
}

async function reloadUsers() {
  activeLoadController?.abort()
  const loadController = new AbortController()
  activeLoadController = loadController
  const requestId = ++latestLoadRequestId

  isLoading.value = true
  loadError.value = null
  nextPageToken.value = null
  try {
    const response = await ApiProviderUsersService.list({
      provider: provider.value,
      search: search.value,
      signal: loadController.signal,
    })
    if (requestId !== latestLoadRequestId) {
      return
    }
    users.value = response.users
    nextPageToken.value = response.nextPageToken ?? null
  } catch (error: unknown) {
    if (isAbortError(error)) {
      return
    }
    users.value = []
    loadError.value = getErrorMessage(error)
  } finally {
    if (activeLoadController === loadController) {
      activeLoadController = null
      isLoading.value = false
    }
  }
}

async function loadMoreUsers() {
  if (!nextPageToken.value) {
    return
  }

  isLoadingMore.value = true
  loadError.value = null
  try {
    const response = await ApiProviderUsersService.list({
      provider: provider.value,
      search: search.value,
      pageToken: nextPageToken.value,
    })
    const knownIds = new Set(users.value.map((user) => user.id))
    users.value = [...users.value, ...response.users.filter((user) => !knownIds.has(user.id))]
    nextPageToken.value = response.nextPageToken ?? null
  } catch (error: unknown) {
    loadError.value = getErrorMessage(error)
  } finally {
    isLoadingMore.value = false
  }
}

function toggleUser(userId: string, selected: boolean) {
  if (selected) {
    if (!selectedUserIds.value.includes(userId)) {
      selectedUserIds.value = [...selectedUserIds.value, userId]
    }
    return
  }

  selectedUserIds.value = selectedUserIds.value.filter((entry) => entry !== userId)
}

function toggleAllVisibleUsers(selected: boolean) {
  if (!selected) {
    const visibleIds = new Set(users.value.map((user) => user.id))
    selectedUserIds.value = selectedUserIds.value.filter((entry) => !visibleIds.has(entry))
    return
  }

  selectedUserIds.value = Array.from(
    new Set([...selectedUserIds.value, ...users.value.map((user) => user.id)]),
  )
}

async function saveImport() {
  if (!canSave.value) {
    return
  }

  isSaving.value = true
  loadError.value = null
  try {
    const result = await ApiProviderUsersService.importUsers({
      provider: provider.value,
      userIds: selectedUserIds.value,
      roleHandles: selectedRoleHandles.value,
      companyHandle: getNumericHandle(selectedCompany.value),
    })
    importResult.value = result
    emit('imported', result)
    selectedUserIds.value = []
  } catch (error: unknown) {
    loadError.value = getErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}

function closeDialog() {
  dialog.value = false
}

function getNumericHandle(item: SaplingGenericItem | null | undefined): number | null {
  const handle = item?.handle
  return typeof handle === 'number' ? handle : null
}

function cancelActiveLoad() {
  activeLoadController?.abort()
  activeLoadController = null
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const record = error as { code?: unknown; name?: unknown; message?: unknown }
  return (
    record.code === 'ERR_CANCELED' ||
    record.name === 'CanceledError' ||
    record.name === 'AbortError' ||
    record.message === 'canceled'
  )
}

function getErrorMessage(error: unknown): string {
  let message = ''
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message ===
      'string'
  ) {
    message = String((error as { response: { data: { message: string } } }).response.data.message)
  } else if (error instanceof Error) {
    message = error.message
  }

  if (message) {
    return i18n.global.te(message) ? i18n.global.t(message) : message
  }

  return i18n.global.t('exception.unknownError')
}
</script>

<style scoped>
.sapling-permission-provider-dialog {
  display: flex;
  flex-direction: column;
  min-height: var(--sapling-dialog-panel-min-height);
  max-height: var(--sapling-dialog-panel-max-height);
  overflow: hidden;
}

.sapling-permission-provider-dialog__body {
  min-width: 0;
}

.sapling-permission-provider-dialog__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sapling-gap-md);
  height: 100%;
  min-width: 0;
}

.sapling-permission-provider-dialog__toolbar {
  align-items: stretch;
  flex-wrap: nowrap;
}

.sapling-permission-provider-dialog__provider-toggle {
  flex: 0 0 auto;
  min-height: var(--sapling-control-size-2xl);
  overflow: hidden;
  border: 1px solid var(--sapling-surface-border-muted);
  border-radius: var(--sapling-radius-sm);
  background: color-mix(in srgb, var(--sapling-surface-fill-soft) 78%, transparent);
  box-shadow: var(--sapling-inset-highlight);
}

.sapling-permission-provider-dialog__provider-toggle :deep(.v-btn) {
  min-height: var(--sapling-control-size-2xl);
  background: transparent !important;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.sapling-permission-provider-dialog__provider-toggle :deep(.v-btn--active) {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent) !important;
  color: rgb(var(--v-theme-primary));
}

.sapling-permission-provider-dialog__search {
  flex: 1 1 18rem;
  min-width: min(100%, 18rem);
}

.sapling-permission-provider-dialog__search :deep(.v-field) {
  min-height: var(--sapling-control-size-2xl);
}

.sapling-permission-provider-dialog__assignment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sapling-gap-md);
  flex: 0 0 auto;
  min-width: 0;
}

.sapling-permission-provider-dialog__roles,
.sapling-permission-provider-dialog__company {
  flex: 0 0 auto;
  min-width: 0;
}

.sapling-permission-provider-dialog__roles :deep(.v-field),
.sapling-permission-provider-dialog__company :deep(.v-field) {
  min-height: var(--sapling-control-size-2xl);
}

.sapling-permission-provider-dialog__roles :deep(.v-field__input),
.sapling-permission-provider-dialog__company :deep(.v-field__input) {
  min-height: var(--sapling-control-size-2xl);
}

.sapling-permission-provider-dialog__list {
  flex: 1 1 auto;
  min-height: 240px;
  height: auto;
  border: 1px solid var(--sapling-surface-border-muted);
  border-radius: var(--sapling-radius-md);
  background: var(--sapling-surface-fill);
  overflow: auto;
  scrollbar-gutter: stable;
}

.sapling-permission-provider-dialog__list :deep(.v-table) {
  min-width: 780px;
  background: transparent;
}

.sapling-permission-provider-dialog__list :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 1;
}

.sapling-permission-provider-dialog__select-cell {
  width: 64px;
}

.sapling-permission-provider-dialog__user {
  display: grid;
  gap: var(--sapling-gap-2xs);
  min-width: 0;
}

.sapling-permission-provider-dialog__user strong,
.sapling-permission-provider-dialog__user span,
.sapling-permission-provider-dialog__list td {
  overflow-wrap: anywhere;
}

.sapling-permission-provider-dialog__user span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--sapling-text-meta-size);
  line-height: 1.35;
}

.sapling-permission-provider-dialog__footer {
  flex: 0 0 auto;
  gap: var(--sapling-gap-md);
}

.sapling-permission-provider-dialog__result {
  max-width: min(100%, 520px);
}

@media (max-width: 900px) {
  .sapling-permission-provider-dialog {
    min-height: min(90vh, 760px, calc(100dvh - 24px));
    max-height: calc(100dvh - 24px);
  }

  .sapling-permission-provider-dialog__toolbar {
    flex-wrap: wrap;
  }

  .sapling-permission-provider-dialog__toolbar > .v-btn-toggle {
    width: 100%;
  }

  .sapling-permission-provider-dialog__assignment-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .sapling-permission-provider-dialog__footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
