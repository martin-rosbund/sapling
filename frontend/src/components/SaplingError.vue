<template>
	<!-- Error page with skeleton loader and not found message -->
	<v-skeleton-loader
		v-if="isLoading"
		class="mx-auto"
		elevation="12"
		type="article, actions"/>
	<template v-else>
		<v-empty-state
			:headline="$t('error.pageNotFoundCode')"
			:title="$t('error.pageNotFound')"/>
	</template>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingError } from '@/composables/useSaplingError';
// #endregion

// #region Composable
const { translationService, isLoading } = useSaplingError();
// #endregion
</script>