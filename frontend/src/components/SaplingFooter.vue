<template>
  <!-- Footer with language and theme toggle buttons -->
  <v-footer app>
    <v-btn
      @click="toggleLanguage"
      variant="text">
    <v-img
      :src="currentLanguage === 'de' ? enFlag  : deFlag"
      width="24"
      height="24"
      cover/>
    </v-btn>
    <v-spacer></v-spacer>
    <v-btn
    :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
    @click="toggleTheme"
    variant="text"
    ></v-btn>
  </v-footer>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingFooter } from '@/composables/useSaplingFooter';
// #endregion

// #region Composable
const {
  theme,
  currentLanguage,
  deFlag,
  enFlag,
  toggleTheme,
  toggleLanguage,
} = useSaplingFooter();
// #endregion
</script>