<template>
  <v-navigation-drawer v-model="drawer" app temporary>
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"/>
    <template v-else>
      <v-list>
        <template v-for="group in groups" :key="group.handle">
          <v-list-item>
            <v-list-item-title>{{ $t(group.handle) }}</v-list-item-title>
          </v-list-item>
          <v-list-item
            v-for="entity in entities.filter(e => e.group === group.handle)"
              :key="entity.handle"
              @click="$router.push('/' + entity.route)">
            <template #prepend>
              <v-icon :icon="entity.icon || 'mdi-square-rounded'"></v-icon>
            </template>
            <v-list-item-title>{{ $t(entity.handle) }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import type { EntityGroupItem, EntityItem } from '@/entity/entity';
import { i18n } from '@/i18n';
  import ApiService from '@/services/api.service';
  import CookieService from '@/services/cookie.service';
  import TranslationService from '@/services/translation.service';
  import { ref, watch, defineProps, defineEmits, onMounted } from 'vue'

  const translationService = ref(new TranslationService(CookieService.get('language')));
  const groups = ref<EntityGroupItem[]>([]);
  const entities = ref<EntityItem[]>([]);
	const isLoading = ref(true);

  const props = defineProps({
    modelValue: Boolean
  })

  const emit = defineEmits(['update:modelValue'])
  const drawer = ref(props.modelValue)

  onMounted(async () => {
    await translationService.value.prepare('navigation', 'navigationGroup');
    groups.value = (await ApiService.find<EntityGroupItem>('generic/entity-group')).data;
    entities.value = (await ApiService.find<EntityItem>('generic/entity', { isMenu: true })).data;
    isLoading.value = false;
  });

  watch(() => props.modelValue, val => drawer.value = val)
  watch(drawer, val => emit('update:modelValue', val))

  watch(() => i18n.global.locale.value,
      async (newLocale) => {
        isLoading.value = true;
        translationService.value = new TranslationService(newLocale);
        await translationService.value.prepare('navigation', 'navigationGroup');
        isLoading.value = false;
  });

  const swagger = import.meta.env.VITE_BACKEND_URL + 'swagger'
  
  const openSwagger = () => {
    window.open(swagger, '_blank')
  }
</script>