<template>
	<!-- Account details card with avatar, personal info, and actions -->
	<v-container class="d-flex justify-center align-center account-container">
		<v-skeleton-loader
			v-if="isLoading || !currentPersonStore.loaded"
			class="sapling-account-loading glass-panel"
			elevation="12"
			type="card-avatar"/>
		<template v-else-if="currentPersonStore.person">
			<v-card v-tilt="TILT_DEFAULT_OPTIONS" class="pa-6 glass-panel tilt-content sapling-account-wide-card" elevation="12">
				<v-row class="mt-4" justify="center">
					<v-col class="text-center">
						<!-- Display the full name of the current person -->
						<h3>{{ currentPersonStore.person?.firstName }} {{ currentPersonStore.person?.lastName }}</h3>
					</v-col>
				</v-row>
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
										<span>{{ currentPersonStore.person?.birthDay ? new Date(currentPersonStore.person.birthDay).toLocaleDateString() : '-' }}</span>
									</v-col>
								</v-row>
							</v-list-item>
							<v-list-item>
								<v-row>
									<v-col cols="12" class="d-flex align-center">
										<v-icon color="primary" class="mr-2">mdi-account-clock</v-icon>
										<span v-if="currentPersonStore.person?.birthDay">{{ calculateAge(currentPersonStore.person.birthDay) }} {{ $t('global.years') }}</span>
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
									<td>{{ workHours.monday?.timeFrom || '-' }}</td>
									<td>{{ workHours.monday?.timeTo || '-' }}</td>
								</tr>
								<tr :class="{ 'sapling-current-day': currentWeekday === 1 }">
									<td>{{ $t('workHourWeek.tuesday') }}</td>
									<td>{{ workHours.tuesday?.timeFrom || '-' }}</td>
									<td>{{ workHours.tuesday?.timeTo || '-' }}</td>
								</tr>
								<tr :class="{ 'sapling-current-day': currentWeekday === 2 }">
									<td>{{ $t('workHourWeek.wednesday') }}</td>
									<td>{{ workHours.wednesday?.timeFrom || '-' }}</td>
									<td>{{ workHours.wednesday?.timeTo || '-' }}</td>
								</tr>
								<tr :class="{ 'sapling-current-day': currentWeekday === 3 }">
									<td>{{ $t('workHourWeek.thursday') }}</td>
									<td>{{ workHours.thursday?.timeFrom || '-' }}</td>
									<td>{{ workHours.thursday?.timeTo || '-' }}</td>
								</tr>
								<tr :class="{ 'current-day': currentWeekday === 4 }">
									<td>{{ $t('workHourWeek.friday') }}</td>
									<td>{{ workHours.friday?.timeFrom || '-' }}</td>
									<td>{{ workHours.friday?.timeTo || '-' }}</td>
								</tr>
								<tr :class="{ 'sapling-current-day': currentWeekday === 5 }">
									<td>{{ $t('workHourWeek.saturday') }}</td>
									<td>{{ workHours.saturday?.timeFrom || '-' }}</td>
									<td>{{ workHours.saturday?.timeTo || '-' }}</td>
								</tr>
								<tr :class="{ 'sapling-current-day': currentWeekday === 6 }">
									<td>{{ $t('workHourWeek.sunday') }}</td>
									<td>{{ workHours.sunday?.timeFrom || '-' }}</td>
									<td>{{ workHours.sunday?.timeTo || '-' }}</td>
								</tr>
							</tbody>
						</v-table>
					</v-col>
				</v-row>
				<v-divider class="my-4"></v-divider>
				<v-row justify="center" >
					<v-card-actions class="d-flex justify-center">
						<!-- Button to change password -->
						<v-btn color="primary" class="ma-2" @click="changePassword">{{ $t('login.changePassword') }}</v-btn>
						<!-- Button to log out -->
						<v-btn color="error" class="ma-2" @click="logout">{{ $t('login.logout') }}</v-btn>
					</v-card-actions>
				</v-row>
			</v-card>
			<!-- Password change dialog -->
			<SaplingPassowordChange v-model="showPasswordChange" @close="showPasswordChange = false" />  
		</template>
	</v-container>
</template>

<script setup lang="ts">
// #region Imports
// Import the composable for account logic
import { useSaplingAccount } from '@/composables/useSaplingAccount';
// Import the password change dialog component
import SaplingPassowordChange from './SaplingChangePassword.vue';
// Import the CSS file for styling the account component
import '@/assets/styles/SaplingAccount.css';
// Import the tilt constants for styling
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
// #endregion

// #region Composable
const {
	isLoading,
	showPasswordChange,
	currentPersonStore,
	workHours,
	changePassword,
	calculateAge,
	logout,
	currentWeekday,
} = useSaplingAccount();
// #endregion
</script>