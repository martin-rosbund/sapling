<template>
    <v-footer app>
        <v-spacer></v-spacer>
        <v-btn
        :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
        ></v-btn>
    </v-footer>
</template>

<script lang="ts" setup>
  import { useTheme } from 'vuetify'

  const theme = useTheme()

  function toggleTheme () {
    if (theme.global.current.value.dark) {
      theme.change('light')
    } else {
      theme.change('dark')
    }
  }
</script>