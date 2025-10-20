<template>
	<v-container class="d-flex justify-center align-center" style="min-height: 300px;">
		<v-card class="pa-6" max-width="400" elevation="10">
			<v-skeleton-loader
				v-if="isLoading"
				class="mx-auto"
				elevation="12"
				type="article, actions"/>
			<template v-else>
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
			</template>
		</v-card>
		<SaplingPassowordChange v-model="showPasswordChange" @close="showPasswordChange = false" />	
	</v-container>
</template>

<script lang="ts">
	import { i18n } from '@/i18n';
	import CookieService from '@/services/cookie.service';
	import TranslationService from '@/services/translation.service';
	import ApiService from '@/services/api.service';
	import axios from 'axios';
	import { defineComponent, onMounted, ref, watch } from 'vue';
	import type { PersonItem } from '@/entity/entity';
	import SaplingPassowordChange from './SaplingChangePassword.vue';

export default defineComponent({
	components: { SaplingPassowordChange },
	setup() {
		const avatarUrl = ref('https://randomuser.me/api/portraits/men/46.jpg');
        const translationService = ref(new TranslationService(CookieService.get('language')));
		const isLoading = ref(true);
  		const person = ref<PersonItem | null>(null);

		onMounted(async () => {
			await translationService.value.prepare('global', 'person', 'login');
			person.value = (await ApiService.findOne<PersonItem>('current/person'));
			isLoading.value = false;
		});

		watch(
		() => i18n.global.locale.value,
		async (newLocale) => {
			isLoading.value = true;
			translationService.value = new TranslationService(newLocale);
			await translationService.value.prepare('global', 'person', 'login');
			isLoading.value = false;
		});

		const showPasswordChange = ref(false);
		const changePassword = () => {
			showPasswordChange.value = true;
		};

		const logout = async () => {
			await axios.get(import.meta.env.VITE_BACKEND_URL + 'auth/logout');
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