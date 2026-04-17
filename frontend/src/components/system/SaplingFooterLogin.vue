<template>
  <!-- Footer with language and theme toggle buttons -->
  <v-footer class="sapling-footer glass-panel">
    <!-- Language toggle -->
    <v-btn @click="toggleLanguage" variant="text">
      <v-img :src="alternateLanguageFlag" width="24" height="24" cover />
    </v-btn>

    <!-- Left spacer -->
    <v-spacer></v-spacer>

    <!-- Version label -->
    <div
      style="
        position: absolute;
        left: 0;
        right: 0;
        margin: auto;
        text-align: center;
        color: #888;
        pointer-events: none;
        width: 100%;
      "
    >
      {{ versionLabel }}
    </div>

    <!-- Right spacer -->
    <v-spacer></v-spacer>

    <!-- Login footer actions -->
    <template v-if="!isLoading">
      <template v-if="showActionsInline">
        <v-btn
          v-for="action in externalActions"
          :key="action.key"
          :icon="action.icon"
          @click="action.handler"
          variant="text"
        />
        <v-btn :icon="themeAction.icon" @click="themeAction.handler" variant="text" />
      </template>
      <template v-else>
        <v-menu location="top right" offset-y>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
          </template>
          <v-list class="glass-panel">
            <v-list-item
              v-for="action in externalActions"
              :key="action.key"
              @click="action.handler"
            >
              <v-list-item-title>{{ $t(action.labelKey) }}</v-list-item-title>
              <template #prepend
                ><v-icon>{{ action.icon }}</v-icon></template
              >
            </v-list-item>
            <v-list-item @click="themeAction.handler">
              <v-list-item-title>{{ $t(themeAction.labelKey) }}</v-list-item-title>
              <template #prepend>
                <v-icon>{{ themeAction.icon }}</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </template>
    <template v-else>
      <div class="sapling-footer-skeleton mx-2">
        <v-skeleton-loader
          v-for="index in skeletonActionCount"
          :key="index"
          type="button"
          class="sapling-footer-skeleton__item"
        />
      </div>
    </template>
  </v-footer>
</template>

<script lang="ts" setup>
// #region Imports
import { computed } from 'vue'
import { useSaplingFooter } from '@/composables/system/useSaplingFooter'
// #endregion

// #region Composable
const {
  alternateLanguageFlag,
  versionLabel,
  showActionsInline,
  externalActions,
  themeAction,
  toggleLanguage,
  isLoading,
} = useSaplingFooter()

const skeletonActionCount = computed(() => externalActions.value.length + 1)
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingFooter.css"></style>
