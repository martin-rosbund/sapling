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
      Version {{ version }}
    </div>
    <!-- Right spacer -->
    <v-spacer></v-spacer>
    <!-- Button to toggle theme, displays the current theme icon -->
    <v-btn
      :icon="'mdi-api'"
      @click="openSwagger"
      variant="text"
    ></v-btn>
    <v-btn
      :icon="'mdi-git'"
      @click="openGit"
      variant="text"
    ></v-btn>
    <v-btn
      :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
      @click="toggleTheme"
      variant="text"
    ></v-btn>
  </v-footer>
</template>

<script lang="ts" setup>
// #region Imports
// Import the composable for handling footer logic
import { useSaplingFooter } from '@/composables/useSaplingFooter';
// Import Vue's ref and onMounted
import { ref, onMounted } from 'vue';
// Import ApiService
import ApiService from '@/services/api.service';
// #endregion

// #region Composable
// Destructure the properties and methods from the useSaplingFooter composable
const {
  theme, // Reactive property for the current theme
  currentLanguage, // Reactive property for the current language
  deFlag, // Path to the German flag image
  enFlag, // Path to the English flag image
  toggleTheme, // Method to toggle the theme
  toggleLanguage, // Method to toggle the language
  openSwagger, // Method to open the Swagger documentation
  openGit // Method to open the Git repository
} = useSaplingFooter();
// #endregion

// Dynamische Version holen
const version = ref('');
onMounted(async () => {
  const result = await ApiService.findOne<{ version: string }>('');
  version.value = result.version;
});
</script>