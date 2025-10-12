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
						<h3>{{ firstName }} {{ lastName }}</h3>
					</v-col>
				</v-row>
				<v-divider class="my-4"></v-divider>
				<v-row justify="center" >
					<v-card-actions class="d-flex justify-center">
						<v-btn color="primary" class="ma-2" @click="changePassword">{{ $t('changePassword') }}</v-btn>
						<v-btn color="error" class="ma-2" @click="logout">{{ $t('logout') }}</v-btn>
					</v-card-actions>
				</v-row>
			</template>
		</v-card>
	</v-container>
</template>

<script lang="ts">
	import { i18n } from '@/i18n';
	import CookieService from '@/services/cookie.service';
	import TranslationService from '@/services/translation.service';
	import axios from 'axios';
	import { defineComponent, onMounted, ref, watch } from 'vue';

export default defineComponent({
	setup() {
		const firstName = ref('Max');
		const lastName = ref('Mustermann');
		const avatarUrl = ref('https://randomuser.me/api/portraits/men/46.jpg');
        const translationService = ref(new TranslationService(CookieService.get('language')));
		const isLoading = ref(true);

		onMounted(async () => {
			await translationService.value.prepare('person', 'login');
			isLoading.value = false;
		});

		watch(
		() => i18n.global.locale.value,
		async (newLocale) => {
			isLoading.value = true;
			translationService.value = new TranslationService(newLocale);
			await translationService.value.prepare('person', 'login');
			isLoading.value = false;
		});

		const changePassword = () => {
			// Logik für Kennwort ändern
			alert('Kennwort ändern angeklickt');
		};

		const logout = async () => {
			await axios.get(import.meta.env.VITE_BACKEND_URL + 'auth/logout');
			window.location.href = '/login';
		};

		return {
			firstName,
			lastName,
			avatarUrl,
			changePassword,
			logout,
			isLoading
		};
	}
});
</script>