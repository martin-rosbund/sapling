<template>
  <sapling-header />
			<v-skeleton-loader
				v-if="isLoading"
				class="mx-auto"
        style="height: 100%;"
				elevation="12"
				type="table"/>
			<template v-else>
        <v-card
          title="Übersetzungen"
          flat>
        <template v-slot:text>
          <v-text-field
            v-model="search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            single-line
          ></v-text-field>
        </template>
        <v-data-table
          style="height: 100%;"
          :headers="headers"
          :items="items"
          :search="search"
        ></v-data-table>
        </v-card>
  </template>
  <sapling-footer />
</template>

<script lang="ts">
	import { i18n } from '@/i18n';
	import CookieService from '@/services/cookie.service';
	import TranslationService from '@/services/translation.service';
	import axios from 'axios';
	import { defineComponent, onMounted, ref, watch } from 'vue';
  import SaplingFooter from '@/components/SaplingFooter.vue';
  import SaplingHeader from '@/components/SaplingHeader.vue';
  import ApiService from '@/services/api.service';
  import type { TranslationItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';

  export default defineComponent({
    name: 'CompanyView',
      components: {
      SaplingHeader,
      SaplingFooter
    },
	setup() {
    const translationService = ref(new TranslationService(CookieService.get('language')));
		const isLoading = ref(true);
    const items = ref<TranslationItem[]>([]);
    const templates = ref<EntityTemplate[]>([]);
    const search = ref('')
    const headers = ref<{ key: string; title: string }[]>([])

		onMounted(async () => {
			await translationService.value.prepare('translation');
      items.value = (await ApiService.find<TranslationItem>('translation')).data;
      templates.value = (await ApiService.findAll<EntityTemplate[]>('translation/template'));

      headers.value = templates.value.map((template) => ({
        key: template.name,
        title: i18n.global.t(template.name)
      }));

			isLoading.value = false;
		});

		watch(
		() => i18n.global.locale.value,
		async (newLocale) => {
			isLoading.value = true;
			translationService.value = new TranslationService(newLocale);
			await translationService.value.prepare('translation');

      headers.value = templates.value.map((template) => ({
        key: template.name,
        title: i18n.global.t(template.name)
      }));
      
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
      items,
      search,
      headers,
			changePassword,
			logout,
			isLoading
		};
	}
  });
</script>