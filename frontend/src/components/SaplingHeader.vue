<template>
    <v-app-bar :elevation="2">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title><v-btn stacked @click="$router.push('/')">Startseite</v-btn></v-app-bar-title>

      <template v-slot:append>
        <v-btn stacked @click="$router.push('/account')">
          <v-badge location="top right" color="primary" content="1">
            <v-icon icon="mdi-account"></v-icon>
          </v-badge> 
        </v-btn>
        <v-btn class="text-none" stacked>
          <v-badge location="top right" color="primary" content="5">
            <v-icon icon="mdi-email"></v-icon>
          </v-badge>
        </v-btn>
      </template>
    </v-app-bar>

  <SaplingNavigation v-model="drawer" />
</template>

<script setup>
  import { ref } from 'vue'
  import SaplingNavigation from './SaplingNavigation.vue'
  const drawer = ref(false)
</script>