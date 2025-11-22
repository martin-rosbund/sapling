<template>
  <!-- Navigation drawer for the main app navigation -->
  <v-navigation-drawer v-model="drawer" app temporary>
    <v-skeleton-loader
      v-if="isLoading"
      elevation="12"
      class="fill-height glass-panel"
      type="paragraph"/>
    <template v-else>
      <v-list>
        <v-expansion-panels v-model="expandedPanels" multiple>
          <template v-for="group in groups" :key="group.handle">
            <v-expansion-panel :value="group.handle" class="transparent">
              <v-expansion-panel-title>
                {{ $t(`navigationGroup.${group.handle}`) }}
              </v-expansion-panel-title>
              <v-expansion-panel-text >
                <template v-for="entity in getEntitiesByGroup(group.handle)" :key="entity.handle">
                  <v-list-item @click="$router.push('/' + entity.route)">
                    <template #prepend>
                      <v-icon :icon="entity.icon || 'mdi-square-rounded'"></v-icon>
                    </template>
                    <v-list-item-title >{{ $t(`navigation.${entity.handle}`) }}</v-list-item-title>
                  </v-list-item>
                </template>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </template>
        </v-expansion-panels>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// #region Imports
// Import the composable for managing navigation logic
import { useSaplingNavigation } from '@/composables/useSaplingNavigation';
// Import Vue's props and emits definitions
import { defineProps, defineEmits } from 'vue';
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
  getEntitiesByGroup, // Method to get entities by group
} = useSaplingNavigation(props, emit);
// #endregion

// #region Expansion Panel State
import { ref, watch } from 'vue';
// Standard: nur die obersten zwei Gruppen offen
const expandedPanels = ref<string[]>([]);

// Wenn Gruppen geladen werden, nur die ersten zwei öffnen
watch(groups, (newGroups) => {
  expandedPanels.value = newGroups.filter(g => g.isExpanded).map(g => g.handle);
}, { immediate: true });
// #endregion
</script>