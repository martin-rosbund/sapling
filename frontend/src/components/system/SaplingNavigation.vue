<template>
  <!-- Navigation drawer for the main app navigation -->
  <v-navigation-drawer v-model="drawer" app temporary width="380">
    <div>
      <div>
        <v-text-field
          v-model="navigationSearch"
          clearable
          density="compact"
          hide-details
          prepend-inner-icon="mdi-magnify"
          :disabled="isLoading"
          :placeholder="isLoading ? '' : $t('global.search')"/>
      </div>

      <div v-if="isLoading" class="px-2 py-4">
        <v-skeleton-loader
          v-for="item in 4"
          :key="item"
          class="mb-3"
          elevation="12"
          type="list-item-two-line"
        />
      </div>

      <v-list v-else>
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
                  <v-list-item @click="navigateToRoute(entry.routes[0])">
                    <template #prepend>
                      <v-icon :icon="entry.entity.icon || 'mdi-square-rounded'"></v-icon>
                    </template>
                    <v-list-item-title >{{ getRouteLabel(entry.entity, entry.routes[0]) }}</v-list-item-title>
                  </v-list-item>
                </template>
                <template v-else>
                    <template v-for="routeObj in entry.routes" :key="routeObj.route ?? routeObj.handle">
                      <v-list-item @click="navigateToRoute(routeObj)">
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
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingNavigation } from '@/composables/system/useSaplingNavigation';
// #endregion

// #region Props & Emits
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();
// #endregion

// #region Composable
const {
  isLoading,
  drawer,
  navigationSearch,
  expandedPanels,
  filteredGroups,
  hasSearchResults,
  getGroupLabel,
  getRouteLabel,
  navigateToRoute,
} = useSaplingNavigation(props, emit);
// #endregion

</script>