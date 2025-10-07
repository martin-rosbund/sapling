<template>
    <v-footer app>
        <v-btn
            @click="toggleLanguage"
            variant="text"
        >
        <v-img
            :src="currentLanguage === 'de' ? enFlag  : deFlag"
            width="24"
            height="24"
            cover
        />
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
  import CookieService from '@/services/cookie.service'
  import { ref } from 'vue'
  import { useTheme } from 'vuetify'
  import { i18n } from '@/i18n'
  import deFlag from '@/assets/language/de-DE.png'
  import enFlag from '@/assets/language/en-US.png'

  const theme = useTheme()
  const currentLanguage = ref(CookieService.get('language') || 'de-DE')

  function toggleTheme () {
    if (theme.global.current.value.dark) {
      theme.change('light')
      CookieService.set('theme', 'light')
    } else {
      theme.change('dark')
      CookieService.set('theme', 'dark')
    }
  }
   
  function toggleLanguage () {
    if (currentLanguage.value === 'de') {
      currentLanguage.value = 'en'
      CookieService.set('language', 'en')
      i18n.global.locale.value = 'en'
    } else {
      currentLanguage.value = 'de'
      CookieService.set('language', 'de')
      i18n.global.locale.value = 'de'
    }
  }
</script>