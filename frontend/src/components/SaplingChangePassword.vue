
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
import { defineComponent, ref, onMounted, watch } from 'vue';
import axios from 'axios';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import { i18n } from '@/i18n';

export default defineComponent({
		setup(props, { emit }) {
			const newPassword = ref("");
			const confirmPassword = ref("");
			const isLoading = ref(true);
			const messages = ref<string[]>([]);
			const translationService = ref(new TranslationService(CookieService.get('language')));

			onMounted(async () => {
				await translationService.value.prepare('login');
				isLoading.value = false;
			});

			watch(
				() => i18n.global.locale.value,
				async (newLocale) => {
					isLoading.value = true;
					translationService.value = new TranslationService(newLocale);
					await translationService.value.prepare('login');
					isLoading.value = false;
				}
			);

			const handlePasswordChange = async () => {
				try {
					await axios.post(import.meta.env.VITE_BACKEND_URL + 'current/changePassword', {
						newPassword: newPassword.value,
						confirmPassword: confirmPassword.value
					});
					window.location.href = '/';
				} catch (error: unknown) {
					console.error('Password change failed:', error);
					messages.value.push(i18n.global.t(error.response.data.message || 'login.changePasswordError'));
				}
			};

			const closeDialog = () => {
				emit('close');
			};

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
