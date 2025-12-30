<template>
  <!-- Footer with language and theme toggle buttons -->
  <v-footer app class="glass-panel">
    <!-- Button to toggle language, displays the current language flag -->
    <v-btn
      @click="toggleLanguage"
      variant="text">
      <v-img
        :src="currentLanguage === 'de' ? enFlag  : deFlag"
        width="24"
        height="24"
        cover/>
    </v-btn>
    <!-- Left spacer -->
    <v-spacer></v-spacer>
    <!-- Absolutely centered version text -->
    <div style="position: absolute; left: 0; right: 0; margin: auto; text-align: center; color: #888; pointer-events: none; width: 100%;">
      {{ version?.length > 0 ? `Version ${version}` : '' }}
    </div>
    <!-- Right spacer -->
    <v-spacer></v-spacer>
    <!-- Responsive: Show actions inline or in menu -->
    <template v-if="showActionsInline">
      <v-btn :icon="'mdi-api'" @click="openSwagger" variant="text"></v-btn>
      <v-btn :icon="'mdi-git'" @click="openGit" variant="text"></v-btn>
      <v-btn :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" @click="toggleTheme" variant="text"></v-btn>
    </template>
    <template v-else>
      <v-menu location="top right" offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
        </template>
        <v-list class="glass-panel">
          <v-list-item @click="openSwagger">
            <v-list-item-title>{{ $t('global.swagger') }}</v-list-item-title>
            <template #prepend><v-icon>mdi-api</v-icon></template>
          </v-list-item>
          <v-list-item @click="openGit">
            <v-list-item-title>{{ $t('global.git') }}</v-list-item-title>
            <template #prepend><v-icon>mdi-git</v-icon></template>
          </v-list-item>
          <v-list-item @click="toggleTheme">
            <v-list-item-title>{{ theme.global.current.value.dark ? $t('global.themeLight') : $t('global.themeDark') }}</v-list-item-title>
            <template #prepend>
              <v-icon>{{ theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-footer>
</template>

<script lang="ts" setup>
// #region Imports
// Import the composable for handling footer logic
import { useSaplingFooter } from '@/composables/system/useSaplingFooter';
// #endregion

// #region Composable
// Destructure the properties and methods from the useSaplingFooter composable
const {
  theme, // Reactive property for the current theme
  currentLanguage, // Reactive property for the current language
  deFlag, // Path to the German flag image
  enFlag, // Path to the English flag image
  version, // Reactive property for the application version
  showActionsInline, // Reactive property to determine if actions should be shown inline
  toggleTheme, // Method to toggle the theme
  toggleLanguage, // Method to toggle the language
  openSwagger, // Method to open the Swagger documentation
  openGit, // Method to open the Git repository
} = useSaplingFooter();
// #endregion

</script>