<template>
	<!-- Account details card with avatar, personal info, and actions -->
	<v-container class="d-flex justify-center align-center" style="min-height: 300px;">
		<v-skeleton-loader
			v-if="isLoading"
			class="mx-auto"
			elevation="12"
			width="400"
			height="500"
			type="card-avatar"/>
		<template v-else>
			<v-card class="pa-6" elevation="12">
					<v-row justify="center">
						<v-avatar size="120">
							<img :src="avatarUrl" alt="Avatar" />
						</v-avatar>
					</v-row>
					<v-row class="mt-4" justify="center">
						<v-col class="text-center">
							<h3>{{ person?.firstName }} {{ person?.lastName }}</h3>
						</v-col>
					</v-row>
					<v-row>
						<v-col cols="12">
							<v-list dense>
								<v-list-item>
									<v-row>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-mail</v-icon>
											<span>{{ person?.email || '-' }}</span>
										</v-col>
									</v-row>
								</v-list-item>
								<v-list-item>
									<v-row>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-cellphone</v-icon>
											<span>{{ person?.mobile || '-' }}</span>
										</v-col>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-phone</v-icon>
											<span>{{ person?.phone || '-' }}</span>
										</v-col>
									</v-row>
								</v-list-item>
								<v-list-item>
									<v-row>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-cake-variant</v-icon>
											<span>{{ person?.birthDay ? new Date(person.birthDay).toLocaleDateString() : '-' }}</span>
										</v-col>
										<v-col cols="6" class="d-flex align-center">
											<v-icon color="primary" class="mr-2">mdi-account-clock</v-icon>
											<span v-if="person?.birthDay">{{ calculateAge(person.birthDay) }} {{ $t('global.years') }}</span>
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

<script lang="ts">

// Import required modules and services
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import ApiService from '@/services/api.service';
import axios from 'axios';
import { defineComponent, onMounted, ref, watch } from 'vue';
import type { PersonItem } from '@/entity/entity';
import SaplingPassowordChange from './SaplingChangePassword.vue';

export default defineComponent({
	components: { SaplingPassowordChange },
	setup() {
		// Avatar image URL (placeholder)
		const avatarUrl = ref('https://randomuser.me/api/portraits/men/46.jpg');
		// Translation service instance
		const translationService = ref(new TranslationService());
		// Loading state
		const isLoading = ref(true);
		// Person data object
		const person = ref<PersonItem | null>(null);

		/**
		 * Prepare translations for navigation and group labels.
		 */
		async function prepareTranslations() {
			isLoading.value = true;
			await translationService.value.prepare('global', 'person', 'login');
			isLoading.value = false;
		}

		// Fetch translations and person data on mount
		onMounted(async () => {
			prepareTranslations();
			person.value = (await ApiService.findOne<PersonItem>('current/person'));
		});

		// Watch for language changes and reload translations
		watch(
		() => i18n.global.locale.value,
		async () => {
			prepareTranslations();
		});

		// State for password change dialog
		const showPasswordChange = ref(false);
		// Open password change dialog
		const changePassword = () => {
			showPasswordChange.value = true;
		};

		// Logout function
		const logout = async () => {
			await axios.get(import.meta.env.VITE_BACKEND_URL + 'auth/logout');
			window.location.href = '/login';
		};

		// Calculate age from birthday
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

		// Expose variables and methods to template
		return {
			person,
			avatarUrl,
			changePassword,
			logout,
			isLoading,
			calculateAge,
			showPasswordChange
		};
	}
});
</script>