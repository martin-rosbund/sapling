<template>
  <v-app>
    <v-main>
      <router-view/>
    </v-main>
    <v-app-bar :elevation="2">
      <template v-slot:prepend>
        <v-app-bar-nav-icon></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title>Application Bar</v-app-bar-title>
    </v-app-bar>
    <v-footer app>
      <v-spacer></v-spacer>
      <v-btn
        :icon="theme.global.current.value.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>
    </v-footer>
  </v-app>
</template>

<script lang="ts" setup>
  import { useTheme } from 'vuetify'

  const theme = useTheme()

  function toggleTheme () {
    theme.global.current.value.dark ? theme.change('light') : theme.change('dark')
  }
</script>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',

  data () {
    return {
      //
    }
  },
})
</script>