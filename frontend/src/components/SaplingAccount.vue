<template>
	<!-- Account details card with avatar, personal info, and actions -->
	<v-container class="d-flex justify-center align-center account-container">
		<v-skeleton-loader
			v-if="isLoading || !currentPersonStore.loaded"
			class="mx-auto"
			elevation="12"
			width="400"
			height="500"
			type="card-avatar"/>
		<template v-else-if="currentPersonStore.person">
			<v-card class="pa-6 account-card" elevation="12">
					<v-row class="mt-4" justify="center">
						<v-col class="text-center">
							<h3>{{ 	currentPersonStore.person?.firstName }} {{ currentPersonStore.person?.lastName }}</h3>
						</v-col>
					</v-row>
					<v-row>
						<v-col cols="12">
							<v-list dense>
								<v-list-item>
									<v-row>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-mail</v-icon>
											<span>{{ currentPersonStore.person?.email || '-' }}</span>
										</v-col>
									</v-row>
								</v-list-item>
								<v-list-item>
									<v-row>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-cellphone</v-icon>
											<span>{{ currentPersonStore.person?.mobile || '-' }}</span>
										</v-col>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-phone</v-icon>
											<span>{{ currentPersonStore.person?.phone || '-' }}</span>
										</v-col>
									</v-row>
								</v-list-item>
								<v-list-item>
									<v-row>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-cake-variant</v-icon>
											<span>{{ currentPersonStore.person?.birthDay ? new Date(currentPersonStore.person.birthDay).toLocaleDateString() : '-' }}</span>
										</v-col>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-account-clock</v-icon>
											<span v-if="currentPersonStore.person?.birthDay">{{ calculateAge(currentPersonStore.person.birthDay) }} {{ $t('global.years') }}</span>
											<span v-else>-</span>
										</v-col>
									</v-row>
								</v-list-item>
							</v-list>
						</v-col>
					</v-row>
					<v-divider class="my-4"></v-divider>
					<v-row justify="center" >
						<v-card-actions class="d-flex justify-center">
							<v-btn color="primary" class="ma-2" @click="changePassword">{{ $t('login.changePassword') }}</v-btn>
							<v-btn color="error" class="ma-2" @click="logout">{{ $t('login.logout') }}</v-btn>
						</v-card-actions>
					</v-row>
			</v-card>
			<SaplingPassowordChange v-model="showPasswordChange" @close="showPasswordChange = false" />  
		</template>
	</v-container>
</template>

<script setup lang="ts">
// #region Imports
// Import necessary modules and components
import { i18n } from '@/i18n'; // Internationalization instance
import TranslationService from '@/services/translation.service'; // Service for handling translations
import axios from 'axios'; // HTTP client for API requests
import { ref, onMounted, watch } from 'vue'; // Vue composition API functions
import SaplingPassowordChange from './SaplingChangePassword.vue'; // Password change dialog component
import { BACKEND_URL } from '@/constants/project.constants'; // Backend API base URL
import { useCurrentPersonStore } from '@/stores/currentPersonStore'; // Pinia store for current user
// #endregion

// #region Refs
// Reactive references for translation service, loading state, and password change dialog
const translationService = ref(new TranslationService());
const isLoading = ref(true); // Indicates if data is loading
const showPasswordChange = ref(false); // Controls visibility of password change dialog
// #endregion

// #region Stores
// Access the current person/user store
const currentPersonStore = useCurrentPersonStore();
// #endregion

// #region Lifecycle
// On component mount, load translations and fetch current user data
onMounted(async () => {
	loadTranslations();
	currentPersonStore.fetchCurrentPerson();
});

// Watch for language changes and reload translations when locale changes
watch(
	() => i18n.global.locale.value,
	async () => {
		loadTranslations();
	}
);
// #endregion

// #region Translations
// Loads translations for global, person, and login scopes
async function loadTranslations() {
	isLoading.value = true;
	await translationService.value.prepare('global', 'person', 'login');
	isLoading.value = false;
}
// #endregion

// #region Password
// Opens the password change dialog
function changePassword() {
	showPasswordChange.value = true;
}
// #endregion

// #region Age
// Calculates age based on birth date
function calculateAge(birthDay: Date | string | null): number | null {
	if (!birthDay) return null;
	const birth = new Date(birthDay);
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const m = today.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}
// #endregion

// #region Logout
// Logs out the user and redirects to login page
async function logout() {
	await axios.get(BACKEND_URL + 'auth/logout');
	window.location.href = '/login';
}
// #endregion
</script>