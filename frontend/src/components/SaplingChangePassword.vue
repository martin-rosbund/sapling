

<!-- Dialog for changing the user password -->
<template>
	<v-dialog  max-width="600" persistent>	
		<v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
		<v-skeleton-loader
			v-if="isLoading"
			class="mx-auto"
			elevation="12"
			type="article, actions"/>
		<template v-else>
			<v-card class="pa-6" max-width="600" elevation="10">
				<v-card-title class="text-h5 text-center">
					{{ $t('login.changePasswordTitle') }}
				</v-card-title>
				<v-card-text>
					<v-form @submit.prevent="handlePasswordChange">
						<v-text-field
							:label="$t('login.newPassword')"
							prepend-icon="mdi-lock"
							type="password"
							v-model="newPassword"
						></v-text-field>
						<v-text-field
							:label="$t('login.confirmPassword')"
							prepend-icon="mdi-lock-check"
							type="password"
							v-model="confirmPassword"
						></v-text-field>
					</v-form>
				</v-card-text>
				<v-divider class="my-4"></v-divider>
				<v-row justify="center" >
					<v-card-actions class="d-flex justify-center">  
						<v-btn color="primary" @click="handlePasswordChange" class="ma-2">
							{{ $t('login.changePassword') }}
						</v-btn>
						<v-btn color="default" @click="closeDialog" class="ma-2">
							{{ $t('global.cancel') }}
						</v-btn>
					</v-card-actions>
				</v-row>
			</v-card>
		</template>
	</v-dialog>
</template>


<script setup lang="ts">

// #region Imports
// Import necessary modules and components
import { ref, onMounted, watch } from 'vue'; // Vue composition API functions
import axios from 'axios'; // HTTP client for API requests
import TranslationService from '@/services/translation.service'; // Service for handling translations
import { i18n } from '@/i18n'; // Internationalization instance
import { BACKEND_URL } from '@/constants/project.constants'; // Backend API base URL
// #endregion

// #region Refs
// Reactive references for password fields, loading state, messages, and translation service
const newPassword = ref(""); // New password input
const confirmPassword = ref(""); // Confirm password input
const isLoading = ref(true); // Indicates if data is loading
const messages = ref<string[]>([]); // Error messages for snackbar
const translationService = ref(new TranslationService()); // Translation service instance
// #endregion

// #region Emits
// Emits close event to parent component
const emit = defineEmits(['close']);
// #endregion

// #region Lifecycle
// On component mount, load translations
onMounted(async () => {
	await translationService.value.prepare('login');
	isLoading.value = false;
});

// Watch for language changes and reload translations when locale changes
watch(
	() => i18n.global.locale.value,
	async () => {
		isLoading.value = true;
		translationService.value = new TranslationService();
		await translationService.value.prepare('login');
		isLoading.value = false;
	}
);
// #endregion

// #region Password Change
// Handles password change request
async function handlePasswordChange() {
	try {
		await axios.post(BACKEND_URL + 'current/changePassword', {
			newPassword: newPassword.value,
			confirmPassword: confirmPassword.value
		});
		window.location.href = '/';
	} catch (error) {
		console.error('Password change failed:', error);
		if (axios.isAxiosError(error)) {
			messages.value.push(i18n.global.t(error.response?.data.message || 'login.changePasswordError'));
		}
	}
}
// #endregion

// #region Dialog
// Closes the password change dialog
function closeDialog() {
	emit('close');
}
// #endregion
</script>
