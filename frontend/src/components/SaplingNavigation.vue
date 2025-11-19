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
            <!-- Display the group title -->
            <v-list-item-title>{{ $t(`navigationGroup.${group.handle}`) }}</v-list-item-title>
          </v-list-item>
          <template v-for="entity in getEntitiesByGroup(group.handle)" :key="entity.handle">
            <v-list-item @click="$router.push('/' + entity.route)">
              <template #prepend>
                <!-- Display the entity icon -->
                <v-icon :icon="entity.icon || 'mdi-square-rounded'"></v-icon>
              </template>
              <!-- Display the entity title -->
              <v-list-item-title>{{ $t(`navigation.${entity.handle}`) }}</v-list-item-title>
            </v-list-item>
          </template>
        </template>
        <!-- Swagger API documentation link -->
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
  openSwagger, // Method to open Swagger documentation
} = useSaplingNavigation(props, emit);
// #endregion
</script>