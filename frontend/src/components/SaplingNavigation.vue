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
import { useSaplingNavigation } from '@/composables/useSaplingNavigation';
import { defineProps, defineEmits } from 'vue';
// #endregion

// #region Composable
const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);
const {
  translationService,
  isLoading,
  groups,
  entities,
  ownPermission,
  drawer,
  getEntitiesByGroup,
  openSwagger,
} = useSaplingNavigation(props, emit);
// #endregion
</script>