<template>
  <!-- Navigation drawer for the main app navigation -->
  <v-navigation-drawer v-model="drawer" app temporary>
    <!-- Show skeleton loader while loading data -->
    <v-skeleton-loader
      v-if="isLoading"
      elevation="12"
      class="fill-height"
      type="paragraph"/>
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
// #region Imports
// Import required modules and components
import { BACKEND_URL } from '@/constants/project.constants'; // Project constants
import type { EntityGroupItem, EntityItem } from '@/entity/entity'; // Entity types
import type { AccumulatedPermission } from '@/entity/structure'; // Permission types
import { i18n } from '@/i18n'; // Internationalization instance
import ApiGenericService from '@/services/api.generic.service'; // Generic API service
import TranslationService from '@/services/translation.service'; // Translation service
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'; // Pinia store for permissions
import { ref, watch, defineProps, defineEmits, onMounted } from 'vue'; // Vue composition API
// #endregion

// #region State
// Reactive references for translation, loading, groups, entities, and permissions
const translationService = ref(new TranslationService()); // Translation service instance
const isLoading = ref(true); // Loading state
const groups = ref<EntityGroupItem[]>([]); // Entity groups for navigation
const entities = ref<EntityItem[]>([]); // Entities for navigation
const ownPermission = ref<AccumulatedPermission[] | null>(null); // Current user's permissions
// #endregion

// #region Props & Emits
// Props for v-model binding
const props = defineProps({
  modelValue: Boolean
});
// Emits for v-model updates
const emit = defineEmits(['update:modelValue']);
// Drawer open/close state
const drawer = ref(props.modelValue);
// #endregion

// #region Lifecycle
// On component mount, fetch permissions, translations, and navigation data
onMounted(async () => {
  await setOwnPermissions();
  await loadTranslation();
  await fetchGroupsAndEntities();
});

// Watch for changes in v-model and update drawer state
watch(() => props.modelValue, val => drawer.value = val);
// Emit changes when drawer state changes
watch(drawer, val => emit('update:modelValue', val));

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async () => {
  await loadTranslation();
});
// #endregion

// #region Permissions
// Fetch current user's permissions
async function setOwnPermissions() {
  const currentPermissionStore = useCurrentPermissionStore();
  await currentPermissionStore.fetchCurrentPermission();
  ownPermission.value = currentPermissionStore.accumulatedPermission;
}
// #endregion

// #region Translations
// Prepare translations for navigation and group labels
async function loadTranslation() {
  isLoading.value = true;
  await translationService.value.prepare('navigation', 'navigationGroup');
  isLoading.value = false;
}
// #endregion

// #region Navigation Data
// Fetch entity groups and entities for the navigation menu
async function fetchGroupsAndEntities() {
  entities.value = (await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } })).data;
  // Filter entities based on user's permissions
  if (ownPermission.value) {
    entities.value = entities.value.filter(entity => {
      return ownPermission.value?.some(permission => permission.entityName === entity.handle && permission.allowShow);
    });
  }
  groups.value = (await ApiGenericService.find<EntityGroupItem>('entityGroup')).data;
  if (ownPermission.value) {
    const allowedGroupHandles = new Set(
      entities.value.map(entity => entity.group)
    );
    groups.value = groups.value.filter(group => allowedGroupHandles.has(group.handle));
  }
}

// Get all entities belonging to a specific group
function getEntitiesByGroup(groupHandle: string) {
  return entities.value.filter(e => e.group === groupHandle);
}
// #endregion

// #region Swagger
// Swagger URL for API documentation
const swagger = BACKEND_URL + 'swagger';
// Open Swagger documentation in a new tab
function openSwagger() {
  window.open(swagger, '_blank');
}
// #endregion
</script>