<template>
  <!-- Navigation drawer for the main app navigation -->
  <v-navigation-drawer v-model="drawer" app temporary width="380">
    <v-skeleton-loader
      v-if="isLoading"
      elevation="12"
      class="fill-height"
      type="paragraph"/>
    <template v-else>
      <div>
        <div>
          <v-text-field
            v-model="navigationSearch"
            clearable
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            :placeholder="t('global.search')"/>
        </div>
        <v-list>
          <v-expansion-panels v-if="hasSearchResults" v-model="expandedPanels" multiple >
            <template v-for="groupResult in filteredGroups" :key="groupResult.group.handle">
              <v-expansion-panel :value="groupResult.group.handle">
              <v-expansion-panel-title>
                <v-icon class="pr-6">{{ groupResult.group.icon }}</v-icon>
                {{ getGroupLabel(groupResult.group.handle) }}
              </v-expansion-panel-title>
              <v-expansion-panel-text >
                <template v-for="entry in groupResult.entries" :key="entry.entity.handle">
                  <template v-if="entry.routes.length === 1">
                    <v-list-item @click="$router.push('/' + (entry.routes[0].route || ''))">
                      <template #prepend>
                        <v-icon :icon="entry.entity.icon || 'mdi-square-rounded'"></v-icon>
                      </template>
                      <v-list-item-title >{{ getRouteLabel(entry.entity, entry.routes[0]) }}</v-list-item-title>
                    </v-list-item>
                  </template>
                  <template v-else>
                      <template v-for="routeObj in entry.routes" :key="routeObj.route ?? routeObj.handle">
                        <v-list-item @click="$router.push('/' + routeObj.route)">
                          <template #prepend>
                            <v-icon :icon="entry.entity.icon || 'mdi-square-rounded'"></v-icon>
                          </template>
                          <v-list-item-title>
                            {{ getRouteLabel(entry.entity, routeObj) }}
                          </v-list-item-title>
                        </v-list-item>
                      </template>
                  </template>
                </template>
              </v-expansion-panel-text>
            </v-expansion-panel>
            </template>
          </v-expansion-panels>
        </v-list>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// #region Imports
// Import the composable for managing navigation logic
import { useSaplingNavigation } from '@/composables/system/useSaplingNavigation';
import type { EntityGroupItem, EntityItem, EntityRouteItem } from '@/entity/entity';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
// #endregion

// #region Props and Emits
// Define the props for the component
const props = defineProps({ modelValue: Boolean });
// Define the emits for the component
const emit = defineEmits(['update:modelValue']);
// #endregion

// #region Composable
// Destructure the properties and methods from the useSaplingNavigation composable
const {
  isLoading, // Reactive property indicating if data is loading
  groups, // Reactive property for the groups of entities
  drawer, // Reactive property for the navigation drawer state
  expandedPanels, // Reactive property for the expanded panels
  getEntitiesByGroup, // Method to get entities by group
} = useSaplingNavigation(props, emit);

const { t } = useI18n();
const navigationSearch = ref('');

interface FilteredNavigationEntry {
  entity: EntityItem;
  routes: EntityRouteItem[];
}

interface FilteredNavigationGroup {
  group: EntityGroupItem;
  entries: FilteredNavigationEntry[];
}

const normalizedSearch = computed(() => normalizeText(navigationSearch.value));
const defaultExpandedPanels = computed(() => groups.value.filter(group => group.isExpanded).map(group => group.handle));

const filteredGroups = computed<FilteredNavigationGroup[]>(() => {
  return groups.value.reduce<FilteredNavigationGroup[]>((results, group) => {
    const groupMatches = matchesSearch(getGroupLabel(group.handle), group.handle);
    const entries = getEntitiesByGroup(group.handle)
      .map((entity) => {
        const filterableRoutes = getFilterableRoutes(entity);
        const entityMatches = matchesSearch(getEntityLabel(entity.handle), entity.handle);
        const matchingRoutes = filterableRoutes.filter((route) => {
          if (groupMatches || entityMatches) return true;
          return matchesSearch(
            getRouteLabel(entity, route),
            route.navigation,
            route.route,
            route.handle,
          );
        });

        if (matchingRoutes.length === 0) return null;

        return {
          entity,
          routes: matchingRoutes,
        };
      })
      .filter((entry): entry is FilteredNavigationEntry => entry !== null);

    if (entries.length === 0) return results;

    results.push({
      group,
      entries,
    });

    return results;
  }, []);
});

const hasSearchResults = computed(() => filteredGroups.value.length > 0);

watch([normalizedSearch, filteredGroups, defaultExpandedPanels], ([search, nextGroups, nextDefaultPanels]) => {
  if (search) {
    expandedPanels.value = nextGroups.map(({ group }) => group.handle);
    return;
  }

  expandedPanels.value = [...nextDefaultPanels];
}, { immediate: true });

function getGroupLabel(groupHandle: string) {
  return t(`navigationGroup.${groupHandle}`);
}

function getEntityLabel(entityHandle: string) {
  return t(`navigation.${entityHandle}`);
}

function getRouteLabel(entity: EntityItem, route: EntityRouteItem) {
  return route.navigation ? t(`navigation.${route.navigation}`) : getEntityLabel(entity.handle);
}

function getFilterableRoutes(entity: EntityItem) {
  return (entity.routes ?? []).filter(route => Boolean(route.route));
}

function matchesSearch(...values: unknown[]) {
  if (!normalizedSearch.value) return true;

  return values.some(value => normalizeText(value).includes(normalizedSearch.value));
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim().toLocaleLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value).toLocaleLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeText(item)).filter(Boolean).join(' ');
  }

  return '';
}
// #endregion

</script>