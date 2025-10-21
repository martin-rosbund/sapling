

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

<script lang="ts">

// Import required modules and services
import { defineComponent, ref, onMounted, watch } from 'vue';
import axios from 'axios';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import { i18n } from '@/i18n';

export default defineComponent({
		setup(props, { emit }) {
			// New password input
			const newPassword = ref("");
			// Confirm password input
			const confirmPassword = ref("");
			// Loading state
			const isLoading = ref(true);
			// Error or info messages
			const messages = ref<string[]>([]);
			// Translation service instance
			const translationService = ref(new TranslationService(CookieService.get('language')));

			// Prepare translations on mount
			onMounted(async () => {
				await translationService.value.prepare('login');
				isLoading.value = false;
			});

			// Watch for language changes and reload translations
			watch(
				() => i18n.global.locale.value,
				async (newLocale) => {
					isLoading.value = true;
					translationService.value = new TranslationService(newLocale);
					await translationService.value.prepare('login');
					isLoading.value = false;
				}
			);

			// Handle password change submission
			const handlePasswordChange = async () => {
				try {
					await axios.post(import.meta.env.VITE_BACKEND_URL + 'current/changePassword', {
						newPassword: newPassword.value,
						confirmPassword: confirmPassword.value
					});
					window.location.href = '/';
				} catch (error) {
					console.error('Password change failed:', error);
					if (axios.isAxiosError(error))  {
						messages.value.push(i18n.global.t(error.response?.data.message || 'login.changePasswordError'));
					}
				}
			};

			// Close the dialog
			const closeDialog = () => {
				emit('close');
			};

			// Expose variables and methods to template
			return {
				newPassword,
				confirmPassword,
				handlePasswordChange,
				isLoading,
				messages,
				closeDialog
			};
		},
});
</script>
