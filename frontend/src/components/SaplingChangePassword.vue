

<!-- Dialog for changing the user password -->
<template>
	<v-dialog :model-value="modelValue" max-width="600" persistent>
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


<script setup lang="ts">

// #region Imports
import { useSaplingChangePassword } from '@/composables/useSaplingChangePassword';
import { defineProps, defineEmits } from 'vue';
// #endregion

// #region Props & Composable
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['close']);
const {
	newPassword,
	confirmPassword,
	isLoading,
	messages,
	handlePasswordChange,
	closeDialog,
} = useSaplingChangePassword(emit);
// #endregion
</script>
