
<template>
  <!-- Dialog container for the account -->
  <v-dialog v-if="dialog" v-model="dialog" persistent max-width="800px">
    <v-card class="glass-panel tilt-content pa-6" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12" style="height: 100%; height: 80vh; display: flex; flex-direction: column;">
      <!-- Skeleton loader displayed while loading -->
      <v-skeleton-loader
        v-if="isLoading || !currentPersonStore.loaded"
        class="mx-auto sapling-skeleton-fullheight transparent"
        elevation="12"
        type="card-avatar, text, text, actions"/>
      <template v-else-if="currentPersonStore.person">
        <v-card-title class="text-white text-center">
          {{ currentPersonStore.person?.firstName }} {{ currentPersonStore.person?.lastName }}
        </v-card-title>
        <v-card-text style="overflow-y: visible;">
          <v-row>
            <v-col :cols="$vuetify.display.xs ? 12 : 6">
              <v-list dense class="transparent">
                <v-list-item>
                  <v-row>
                    <v-col cols="12" class="d-flex align-center">
                      <v-icon color="primary" class="mr-2">mdi-mail</v-icon>
                      <span>{{ currentPersonStore.person?.email || '-' }}</span>
                    </v-col>
                  </v-row>
                </v-list-item>
                <v-list-item>
                  <v-row>
                    <v-col cols="12" class="d-flex align-center">
                      <v-icon color="primary" class="mr-2">mdi-cellphone</v-icon>
                      <span>{{ currentPersonStore.person?.mobile || '-' }}</span>
                    </v-col>
                  </v-row>
                </v-list-item>
                <v-list-item>
                  <v-row>
                    <v-col cols="12" class="d-flex align-center">
                      <v-icon color="primary" class="mr-2">mdi-phone</v-icon>
                      <span>{{ currentPersonStore.person?.phone || '-' }}</span>
                    </v-col>
                  </v-row>
                </v-list-item>
                <v-list-item>
                  <v-row>
                    <v-col cols="12" class="d-flex align-center">
                      <v-icon color="primary" class="mr-2">mdi-cake-variant</v-icon>
                      <span>{{ currentPersonStore.person?.birthDay ? new Date(currentPersonStore.person?.birthDay ?? new Date()).toLocaleDateString() : '-' }}</span>
                    </v-col>
                  </v-row>
                </v-list-item>
                <v-list-item>
                  <v-row>
                    <v-col cols="12" class="d-flex align-center">
                      <v-icon color="primary" class="mr-2">mdi-account-clock</v-icon>
                      <span v-if="currentPersonStore.person?.birthDay">{{ calculateAge(currentPersonStore.person?.birthDay ?? new Date()) }} {{ $t('global.years') }}</span>
                      <span v-else>-</span>
                    </v-col>
                  </v-row>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col :cols="$vuetify.display.xs ? 12 : 6" v-if="workHours">
              <v-table density="compact" class="sapling-workhours-table glass-table mt-4" style="width: 100%;">
                <thead>
                  <tr>
                    <th>{{ $t('navigation.workHour') }}</th>
                    <th>{{ $t('workHour.timeFrom') }}</th>
                    <th>{{ $t('workHour.timeTo') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 0 }">
                    <td>{{ $t('workHourWeek.monday') }}</td>
                    <td>{{ workHours?.monday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.monday?.timeTo || '-' }}</td>
                  </tr>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 1 }">
                    <td>{{ $t('workHourWeek.tuesday') }}</td>
                    <td>{{ workHours?.tuesday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.tuesday?.timeTo || '-' }}</td>
                  </tr>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 2 }">
                    <td>{{ $t('workHourWeek.wednesday') }}</td>
                    <td>{{ workHours?.wednesday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.wednesday?.timeTo || '-' }}</td>
                  </tr>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 3 }">
                    <td>{{ $t('workHourWeek.thursday') }}</td>
                    <td>{{ workHours?.thursday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.thursday?.timeTo || '-' }}</td>
                  </tr>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 4 }">
                    <td>{{ $t('workHourWeek.friday') }}</td>
                    <td>{{ workHours?.friday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.friday?.timeTo || '-' }}</td>
                  </tr>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 5 }">
                    <td>{{ $t('workHourWeek.saturday') }}</td>
                    <td>{{ workHours?.saturday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.saturday?.timeTo || '-' }}</td>
                  </tr>
                  <tr :class="{ 'sapling-current-day': currentWeekday === 6 }">
                    <td>{{ $t('workHourWeek.sunday') }}</td>
                    <td>{{ workHours?.sunday?.timeFrom || '-' }}</td>
                    <td>{{ workHours?.sunday?.timeTo || '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-col>
          </v-row>
        </v-card-text>
      </template>
      <v-card-actions>
        <div class="d-flex w-100 align-center" :class="$vuetify.display.xs ? 'flex-column' : 'flex-row justify-end'">
          <v-btn text class="mb-2 mb-sm-0" @click="$emit('close')">{{ $t('global.close') }}</v-btn>
          <v-spacer v-if="!$vuetify.display.xs"></v-spacer>
          <v-btn color="primary" class="ma-2" @click="changePassword">{{ $t('login.changePassword') }}</v-btn>
          <v-btn color="error" class="ma-2" @click="logout">{{ $t('login.logout') }}</v-btn>
        </div>
      </v-card-actions>
    </v-card>
    <!-- Password change dialog -->
    <SaplingChangePassword v-model="showPasswordChange" @close="showPasswordChange = false" />
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import '@/assets/styles/SaplingAccount.css';
import { useSaplingAccount } from '@/composables/account/useSaplingAccount';
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
// #endregion

// #region Composable
defineEmits(['close']);
const {
  isLoading,
  showPasswordChange,
  currentPersonStore,
  workHours,
  dialog,
  currentWeekday,
  changePassword,
  calculateAge,
  logout,
} = useSaplingAccount();
// #endregion
</script>