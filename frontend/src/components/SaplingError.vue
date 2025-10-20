<template>
    <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto"
        elevation="12"
        type="article, actions"/>
    <template v-else>
        <div class="error-page">
            <h1>{{ $t('error.pageNotFoundCode') }}</h1>
            <p>{{ $t('error.pageNotFound') }}</p>
            <router-link to="/">{{ $t('error.backToMainPage') }}</router-link>
        </div>
    </template>
</template>

<script lang="ts">
	import { i18n } from '@/i18n';
	import CookieService from '@/services/cookie.service';
	import TranslationService from '@/services/translation.service';
	import { defineComponent, onMounted, ref, watch } from 'vue';

export default defineComponent({
	setup() {
        const translationService = ref(new TranslationService(CookieService.get('language')));
		const isLoading = ref(true);

		onMounted(async () => {
			isLoading.value = true;
			await translationService.value.prepare('error');
			isLoading.value = false;
		});

		watch(
		() => i18n.global.locale.value,
		async (newLocale) => {
			isLoading.value = true;
			translationService.value = new TranslationService(newLocale);
			await translationService.value.prepare('error');
			isLoading.value = false;
		});

        return {
            isLoading
        };
	}
});
</script>