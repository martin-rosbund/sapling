<template>
	<!-- Error page with skeleton loader and not found message -->
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

	// Import required modules and services
	import { i18n } from '@/i18n';
	import TranslationService from '@/services/translation.service';
	import { defineComponent, onMounted, ref, watch } from 'vue';

export default defineComponent({
	setup() {
		// Translation service instance
		const translationService = ref(new TranslationService());
		// Loading state
		const isLoading = ref(true);

		// Prepare translations on mount
		onMounted(async () => {
			isLoading.value = true;
			await translationService.value.prepare('error');
			isLoading.value = false;
		});

		// Watch for language changes and reload translations
		watch(
		() => i18n.global.locale.value,
		async () => {
			isLoading.value = true;
			translationService.value = new TranslationService();
			await translationService.value.prepare('error');
			isLoading.value = false;
		});

		// Expose variables to template
		return {
			isLoading
		};
	}
});
</script>