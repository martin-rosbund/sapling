<template>
    <v-app-bar :elevation="2">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title>
        <v-btn stacked @click="$router.push('/')">Startseite</v-btn>
      </v-app-bar-title>

      <template v-slot:append>
        <span style="margin-left: 16px; font-weight: normal;">{{ time }}</span>
        <v-btn class="text-none" stacked>
          <v-badge location="top right" color="primary" content="5">
            <v-icon icon="mdi-email"></v-icon>
          </v-badge>
        </v-btn>
        <v-btn stacked @click="$router.push('/account')">
            <v-icon icon="mdi-account"></v-icon>
        </v-btn>
      </template>
    </v-app-bar>

  <SaplingNavigation v-model="drawer" />
</template>

<script lang="ts" setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import SaplingNavigation from './SaplingNavigation.vue'
  const drawer = ref(false)

  const time = ref(new Date().toLocaleTimeString())
  let timer: number

  onMounted(() => {
    timer = window.setInterval(() => {
      time.value = new Date().toLocaleTimeString()
    }, 1000)
  })

  onUnmounted(() => {
    clearInterval(timer)
  })
</script>