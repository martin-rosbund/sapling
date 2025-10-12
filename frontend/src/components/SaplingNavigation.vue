<template>
  <v-navigation-drawer v-model="drawer" app temporary>
    <v-list>
      <template v-for="group in groups" :key="group.handle">
        <v-list-subheader>{{ group.handle }}</v-list-subheader>
        <v-list-item
          v-for="entity in entities.filter(e => e.group === group.handle)"
          :key="entity.handle"
          @click="$router.push('/' + entity.route)"
        >
          <template #prepend>
            <v-icon>{{ entity.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ entity.handle }}</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import type { EntityGroupItem, EntityItem } from '@/entity/entity';
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
    await translationService.value.prepare('navigation');
    groups.value = (await ApiService.find<EntityGroupItem>('entity-group')).data;
    entities.value = (await ApiService.find<EntityItem>('entity', { isMenu: true })).data;
    console.log(entities.value);
    console.log(groups.value);
    isLoading.value = false;
  });

  watch(() => props.modelValue, val => drawer.value = val)
  watch(drawer, val => emit('update:modelValue', val))

  const swagger = import.meta.env.VITE_BACKEND_URL + 'swagger'
  const openSwagger = () => {
    window.open(swagger, '_blank')
  }
</script>