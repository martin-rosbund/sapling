<template>
	<!-- Error page with skeleton loader and not found message -->
	<v-skeleton-loader
		v-if="isLoading"
		class="mx-auto"
		elevation="12"
		type="article, actions"/>
	<template v-else>
		<div class="sapling-error-page primary">
			<h1>{{ $t('error.pageNotFoundCode') }}</h1>
			<p>{{ $t('error.pageNotFound') }}</p>
		    <v-card-actions class="d-flex justify-center">
				<v-btn color="primary" @click="$router.push('/')" class="ma-2">
				{{ $t('error.backToMainPage') }}
				</v-btn>
          	</v-card-actions>
		</div>
	</template>
</template>


<script setup lang="ts">
// #region Imports
// Import necessary modules and components
import { i18n } from '@/i18n'; // Internationalization instance
import TranslationService from '@/services/translation.service'; // Service for handling translations
import { ref, onMounted, watch } from 'vue'; // Vue composition API functions
// #endregion

// #region Refs
// Reactive references for translation service and loading state
const translationService = ref(new TranslationService()); // Translation service instance
const isLoading = ref(true); // Indicates if data is loading
// #endregion

// #region Lifecycle
// On component mount, load translations for error scope
onMounted(async () => {
	isLoading.value = true;
	await translationService.value.prepare('error');
	isLoading.value = false;
});

// Watch for language changes and reload translations when locale changes
watch(
	() => i18n.global.locale.value,
	async () => {
		isLoading.value = true;
		translationService.value = new TranslationService();
		await translationService.value.prepare('error');
		isLoading.value = false;
	}
);
// #endregion
</script>