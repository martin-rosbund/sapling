<!-- Dialog for changing the user password -->
<template>
	<v-dialog :model-value="modelValue" max-width="600" persistent>
		<!-- Snackbar queue to display error messages -->
		<v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>

		<!-- Skeleton loader displayed while translations or data are loading -->
		<v-skeleton-loader
			v-if="isLoading"
			class="mx-auto sapling-change-password-loading"
			elevation="12"
			type="article, actions"/>

		<!-- Main content of the dialog -->
		<template v-else>
			<v-card class="pa-6" max-width="600" elevation="10">
				<!-- Dialog title -->
				<v-card-title class="text-h5 text-center">
					{{ $t('login.changePasswordTitle') }}
				</v-card-title>

				<!-- Form for entering new password and confirmation password -->
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

				<!-- Divider for visual separation -->
				<v-divider class="my-4"></v-divider>

				<!-- Action buttons for submitting or canceling -->
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
// Import the composable for handling password change logic
import { useSaplingChangePassword } from '@/composables/useSaplingChangePassword';

// Import Vue utilities for defining props and emitting events
import { defineProps, defineEmits } from 'vue';

// Import the CSS file for styling the component
import '@/assets/styles/SaplingChangePassword.css';
// #endregion

// #region Props & Composable
// Define the props accepted by this component
// `modelValue` controls the visibility of the dialog
defineProps<{ modelValue: boolean }>();

// Define the events emitted by this component
// `close` is emitted when the dialog is closed
const emit = defineEmits(['close']);

// Destructure the state variables and functions from the composable
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
