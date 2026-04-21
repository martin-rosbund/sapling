<template>
  <v-menu
    v-model="menuVisible"
    :style="menuStyle"
    absolute
    content-class="sapling-context-menu__content"
    transition="slide-y-transition"
  >
    <v-list density="compact" elevation="8" min-width="200" class="glass-panel">
      <v-list-item prepend-icon="mdi-home" title="Zurück zur Startseite" @click="goHome" />
      <v-list-item prepend-icon="mdi-close" title="Schließen" @click="closeMenu" />
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import { useSaplingContextMenu } from '@/composables/context/useSaplingContextMenu'

const { menuVisible, menuStyle, closeMenu, goHome } = useSaplingContextMenu()
</script>
