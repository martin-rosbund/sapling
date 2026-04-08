<template>
  <!-- Dialog container for the account -->
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-medium">
    <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <v-card-title class="text-white text-center">
        {{ isLoading || !currentPersonStore.loaded ? '' : currentPersonStore.person ? `${currentPersonStore.person.firstName} ${currentPersonStore.person.lastName}` : $t('navigation.account') }}
      </v-card-title>
      <v-card-text style="overflow-y: visible;">
        <template v-if="isLoading || !currentPersonStore.loaded">
          <v-row>
            <v-col :cols="$vuetify.display.xs ? 12 : 6">
              <v-skeleton-loader elevation="12" type="list-item-two-line, list-item-two-line, list-item-two-line" />
            </v-col>
            <v-col :cols="$vuetify.display.xs ? 12 : 6">
              <v-skeleton-loader elevation="12" type="table-heading, table-tbody" />
            </v-col>
          </v-row>
        </template>
        <template v-else-if="currentPersonStore.person">
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
        </template>
      </v-card-text>
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
    </v-card>
    <!-- Password change dialog -->
    <SaplingChangePassword v-model="showPasswordChange" />
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
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

function handleClose() {
  emit('close');
}
// #endregion
</script>