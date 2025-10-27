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


<script lang="ts">
// #region Imports
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import axios from 'axios';
import { defineComponent, onMounted, ref, watch } from 'vue';
import SaplingPassowordChange from './SaplingChangePassword.vue';
import { BACKEND_URL } from '@/constants/project.constants';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
// #endregion Imports

export default defineComponent({
	components: { SaplingPassowordChange },
	setup() {
		// #region State
		const translationService = ref(new TranslationService());
		const isLoading = ref(true);
		const showPasswordChange = ref(false);
		// #endregion State

		// #region Store
		const currentPersonStore = useCurrentPersonStore();
		// #endregion Store

		// #region Methods
		async function loadTranslations() {
			isLoading.value = true;
			await translationService.value.prepare('global', 'person', 'login');
			isLoading.value = false;
		}

		onMounted(async () => {
			loadTranslations();
			currentPersonStore.fetchCurrentPerson();
		});

		watch(
			() => i18n.global.locale.value,
			async () => {
				loadTranslations();
			}
		);

		const changePassword = () => {
			showPasswordChange.value = true;
		};

		const logout = async () => {
			await axios.get(BACKEND_URL + 'auth/logout');
			window.location.href = '/login';
		};

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
		// #endregion Methods

		// #region Expose
		return {
			isLoading,
			currentPersonStore,
			showPasswordChange,
			changePassword,
			calculateAge,
			logout,
		};
		// #endregion Expose
	}
});
</script>