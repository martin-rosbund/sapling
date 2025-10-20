
<template>
  <!-- Navigation drawer for the main app navigation -->
  <v-navigation-drawer v-model="drawer" app temporary>
    <!-- Show skeleton loader while loading data -->
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"/>
    <template v-else>
      <v-list>
        <!-- Render each group and its entities -->
        <template v-for="group in groups" :key="group.handle">
          <v-list-item>
            <v-list-item-title>{{ $t(`navigationGroup.${group.handle}`) }}</v-list-item-title>
          </v-list-item>
          <template v-for="entity in getEntitiesByGroup(group.handle)" :key="entity.handle">
            <v-list-item @click="$router.push('/' + entity.route)">
              <template #prepend>
                <v-icon :icon="entity.icon || 'mdi-square-rounded'"></v-icon>
              </template>
              <v-list-item-title>{{ $t(`navigation.${entity.handle}`) }}</v-list-item-title>
            </v-list-item>
          </template>
        </template>
        <v-list-item @click="openSwagger()">
          <template #prepend>
            <v-icon icon='mdi-api'></v-icon>
          </template>
          <v-list-item-title>{{ $t('navigation.swagger') }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// Import required types and services
import type { EntityGroupItem, EntityItem } from '@/entity/entity';
import { i18n } from '@/i18n';
import ApiGenericService from '@/services/api.generic.service';
import CookieService from '@/services/cookie.service';
import TranslationService from '@/services/translation.service';
import { ref, watch, defineProps, defineEmits, onMounted } from 'vue';

// Reactive reference for translation service, initialized with current language
const translationService = ref(new TranslationService(CookieService.get('language')));
// List of entity groups for navigation
const groups = ref<EntityGroupItem[]>([]);
// List of entities for navigation
const entities = ref<EntityItem[]>([]);
// Loading state for async operations
const isLoading = ref(true);

// Props for v-model binding
const props = defineProps({
  modelValue: Boolean
});

// Emits for v-model updates
const emit = defineEmits(['update:modelValue']);
// Drawer open/close state
const drawer = ref(props.modelValue);

// Fetch groups and entities, and prepare translations on mount
onMounted(async () => {
  await prepareTranslations();
  await fetchGroupsAndEntities();
  isLoading.value = false;
});

// Watch for changes in v-model and update drawer state
watch(() => props.modelValue, val => drawer.value = val);
// Emit changes when drawer state changes
watch(drawer, val => emit('update:modelValue', val));

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async (newLocale) => {
  isLoading.value = true;
  translationService.value = new TranslationService(newLocale);
  await prepareTranslations();
  isLoading.value = false;
});

/**
 * Prepare translations for navigation and group labels.
 */
async function prepareTranslations() {
  await translationService.value.prepare('navigation', 'navigationGroup');
}

/**
 * Fetch entity groups and entities for the navigation menu.
 */
async function fetchGroupsAndEntities() {
  groups.value = (await ApiGenericService.find<EntityGroupItem>('entityGroup')).data;
  entities.value = (await ApiGenericService.find<EntityItem>('entity', { isMenu: true })).data;
}

/**
 * Get all entities belonging to a specific group.
 * @param groupHandle The handle of the group
 * @returns Array of EntityItem
 */
function getEntitiesByGroup(groupHandle: string) {
  return entities.value.filter(e => e.group?.handle === groupHandle);
}

// Swagger URL for API documentation
const swagger = import.meta.env.VITE_BACKEND_URL + 'swagger';

/**
 * Open Swagger documentation in a new tab.
 */
function openSwagger() {
  window.open(swagger, '_blank');
}
</script>