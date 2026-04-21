<template>
  <!-- Dialog container for the account -->
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-medium">
    <v-card
      class="glass-panel tilt-content sapling-account-dialog"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <SaplingDialogShell
        fill-shell
        body-class="sapling-account-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            v-if="isLoading || !currentPersonStore.loaded"
            loading
            :loading-stats-count="2"
          />
          <SaplingDialogHero
            v-else
            :eyebrow="$t('login.account')"
            :title="accountTitle"
            :subtitle="accountSubtitle"
          />
        </template>

        <template #body>
          <div
            v-if="isLoading || !currentPersonStore.loaded"
            class="sapling-account-dialog__content"
          >
            <v-row>
              <v-col :cols="$vuetify.display.xs ? 12 : 6">
                <v-skeleton-loader
                  elevation="12"
                  type="list-item-two-line, list-item-two-line, list-item-two-line"
                />
              </v-col>
              <v-col :cols="$vuetify.display.xs ? 12 : 6">
                <v-skeleton-loader elevation="12" type="table-heading, table-tbody" />
              </v-col>
            </v-row>
          </div>

          <div v-else-if="currentPersonStore.person" class="sapling-account-dialog__content">
            <v-row>
              <v-col :cols="$vuetify.display.xs ? 12 : 6">
                <v-list density="comfortable">
                  <v-list-item v-for="detail in accountDetails" :key="detail.key">
                    <v-row>
                      <v-col cols="12" class="d-flex align-center">
                        <v-icon color="primary" class="mr-2">{{ detail.icon }}</v-icon>
                        <span>
                          {{ detail.value }}
                          <template v-if="detail.suffixKey && detail.value !== '-'">
                            {{ $t(detail.suffixKey) }}
                          </template>
                        </span>
                      </v-col>
                    </v-row>
                  </v-list-item>
                </v-list>
              </v-col>
              <v-col
                :cols="$vuetify.display.xs ? 12 : 6"
                v-if="workHours"
                class="sapling-account-dialog__workhours"
              >
                <div v-if="$vuetify.display.smAndDown" class="sapling-workhours-list mt-4">
                  <article
                    v-for="(workHourRow, index) in workHourRows"
                    :key="workHourRow.key"
                    class="sapling-workhours-card"
                    :class="{ 'sapling-selected-item': currentWeekday === index }"
                  >
                    <div class="sapling-workhours-card__day">
                      {{ $t(`workHourWeek.${workHourRow.key}`) }}
                    </div>
                    <div class="sapling-workhours-card__times">
                      <div class="sapling-workhours-card__time-row">
                        <span class="sapling-workhours-card__label">{{
                          $t('workHour.timeFrom')
                        }}</span>
                        <span>{{ workHourRow.timeFrom }}</span>
                      </div>
                      <div class="sapling-workhours-card__time-row">
                        <span class="sapling-workhours-card__label">{{
                          $t('workHour.timeTo')
                        }}</span>
                        <span>{{ workHourRow.timeTo }}</span>
                      </div>
                    </div>
                  </article>
                </div>
                <v-table v-else density="compact" class="sapling-workhours-table mt-4">
                  <thead>
                    <tr>
                      <th>{{ $t('workHour.workTime') }}</th>
                      <th>{{ $t('workHour.timeFrom') }}</th>
                      <th>{{ $t('workHour.timeTo') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(workHourRow, index) in workHourRows"
                      :key="workHourRow.key"
                      :class="{ 'sapling-selected-item': currentWeekday === index }"
                    >
                      <td>{{ $t(`workHourWeek.${workHourRow.key}`) }}</td>
                      <td>{{ workHourRow.timeFrom }}</td>
                      <td>{{ workHourRow.timeTo }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-col>
            </v-row>
          </div>
        </template>

        <template #actions>
          <div v-if="isLoading || !currentPersonStore.loaded" class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-btn text prepend-icon="mdi-close" class="mb-2 mb-sm-0" @click="handleClose">
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
              <v-spacer />
              <v-btn color="primary" append-icon="mdi-lock-reset" class="ma-2" disabled>
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
              <v-spacer />
              <v-btn color="error" append-icon="mdi-logout" class="ma-2" disabled>
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
            </v-card-actions>
          </div>

          <SaplingActionAccount
            v-else
            :handleClose="handleClose"
            :handleChangePassword="changePassword"
            :handleLogout="logout"
          />
        </template>
      </SaplingDialogShell>
    </v-card>
    <!-- Password change dialog -->
    <SaplingChangePassword v-model="showPasswordChange" />
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { computed } from 'vue'
import { useSaplingAccount } from '@/composables/account/useSaplingAccount'
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingActionAccount from '@/components/actions/SaplingActionAccount.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
// #endregion

// #region Composable
const emit = defineEmits<{
  (event: 'close'): void
}>()

const {
  isLoading,
  showPasswordChange,
  currentPersonStore,
  workHours,
  dialog,
  currentWeekday,
  accountDetails,
  workHourRows,
  changePassword,
  logout,
} = useSaplingAccount()

const accountTitle = computed(() => {
  const person = currentPersonStore.person

  if (!person) {
    return ''
  }

  return `${person.firstName} ${person.lastName}`.trim()
})

const accountSubtitle = computed(
  () => currentPersonStore.person?.email || currentPersonStore.person?.mobile || '',
)

function handleClose() {
  emit('close')
}
// #endregion
</script>
