<template>
  <!-- Dialog container for the account -->
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-medium">
    <v-card class="glass-panel tilt-content sapling-account-dialog" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <div class="sapling-dialog-shell sapling-fill-shell">
        <template v-if="isLoading || !currentPersonStore.loaded">
          <section class="sapling-dialog-hero">
            <div class="sapling-dialog-hero__copy sapling-dialog-hero__loading-copy">
              <v-skeleton-loader type="heading, text" />
            </div>

            <div class="sapling-dialog-hero__stats">
              <v-skeleton-loader
                v-for="item in 2"
                :key="item"
                class="sapling-dialog-hero__loading-stat"
                type="article"
              />
            </div>
          </section>

          <div class="sapling-account-dialog__body">
            <v-row>
              <v-col :cols="$vuetify.display.xs ? 12 : 6">
                <v-skeleton-loader elevation="12" type="list-item-two-line, list-item-two-line, list-item-two-line" />
              </v-col>
              <v-col :cols="$vuetify.display.xs ? 12 : 6">
                <v-skeleton-loader elevation="12" type="table-heading, table-tbody" />
              </v-col>
            </v-row>
          </div>
        </template>

        <template v-else>
          <section class="sapling-dialog-hero">
            <div class="sapling-dialog-hero__copy">
              <div class="sapling-dialog-hero__eyebrow">{{ $t('login.account') }}</div>
              <div class="sapling-dialog-hero__title-row">
                <h2 class="sapling-dialog-hero__title">{{ accountTitle }}</h2>
              </div>
              <p v-if="accountSubtitle" class="sapling-dialog-hero__subtitle">{{ accountSubtitle }}</p>
            </div>
          </section>

          <div v-if="currentPersonStore.person" class="sapling-account-dialog__body">
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
              <v-col :cols="$vuetify.display.xs ? 12 : 6" v-if="workHours">
                <v-table density="compact" class="sapling-workhours-table mt-4">
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

        <template v-if="isLoading || !currentPersonStore.loaded">
          <v-card-actions>
            <v-btn text prepend-icon="mdi-close" class="mb-2 mb-sm-0" @click="handleClose">
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
            <v-spacer/>
            <v-btn color="primary" append-icon="mdi-lock-reset" class="ma-2" disabled>
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
            <v-spacer/>
            <v-btn color="error" append-icon="mdi-logout" class="ma-2" disabled>
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
          </v-card-actions>
        </template>
        <SaplingActionAccount v-else
          :handleClose="handleClose"
          :handleChangePassword="changePassword"
          :handleLogout="logout"
        />
      </div>
    </v-card>
    <!-- Password change dialog -->
    <SaplingChangePassword v-model="showPasswordChange" />
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { computed } from 'vue';
import { useSaplingAccount } from '@/composables/account/useSaplingAccount';
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionAccount from '@/components/actions/SaplingActionAccount.vue';
// #endregion

// #region Composable
const emit = defineEmits<{
  (event: 'close'): void;
}>();

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
} = useSaplingAccount();

const accountTitle = computed(() => {
  const person = currentPersonStore.person;

  if (!person) {
    return '';
  }

  return `${person.firstName} ${person.lastName}`.trim();
});

const accountSubtitle = computed(() => currentPersonStore.person?.email || currentPersonStore.person?.mobile || '');

const accountAge = computed(() => {
  const ageValue = accountDetails.value.find((detail) => detail.key === 'age')?.value;
  return ageValue == null ? '-' : String(ageValue);
});

const scheduledWorkdayCount = computed(() =>
  workHourRows.value.filter((workHourRow) => workHourRow.timeFrom !== '-' && workHourRow.timeTo !== '-').length
);

function handleClose() {
  emit('close');
}
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>