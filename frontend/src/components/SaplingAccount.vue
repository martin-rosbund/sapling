<template>
	<v-container class="d-flex justify-center align-center" style="min-height: 300px;">
		<v-card class="pa-6" max-width="400" elevation="10">
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
					<v-btn color="primary" class="ma-2" @click="changePassword">Kennwort ändern</v-btn>
					<v-btn color="error" class="ma-2" @click="logout">Abmelden</v-btn>
				</v-card-actions>
			</v-row>
		</v-card>
	</v-container>
</template>

<script lang="ts">
import axios from 'axios';
import { defineComponent, ref } from 'vue';

export default defineComponent({
	name: 'SaplingAccount',
	setup() {
		// Beispielwerte, hier ggf. durch echte Userdaten ersetzen
		const firstName = ref('Max');
		const lastName = ref('Mustermann');
		const avatarUrl = ref('https://randomuser.me/api/portraits/men/46.jpg');

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
			logout
		};
	}
});
</script>