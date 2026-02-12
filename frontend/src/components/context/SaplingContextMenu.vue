<template>
  <v-menu
    v-model="menuVisible"
    :style="{ top: `${y}px`, left: `${x}px` }"
    absolute
    transition="slide-y-transition"
  >
    <v-list density="compact" elevation="8" min-width="200" class="glass-panel">
      <v-list-item 
        prepend-icon="mdi-home" 
        title="Zurück zur Startseite" 
        @click="goHome"
      />
      </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const menuVisible = ref(false)
const x = ref(0)
const y = ref(0)

const handleContextMenu = (e: MouseEvent) => {
  // Verhindert das Standard-Browsermenü
  e.preventDefault()
  
  menuVisible.value = false
  x.value = e.clientX
  y.value = e.clientY

  nextTick(() => {
    menuVisible.value = true
  })
}

const goHome = () => {
  router.push('/')
  menuVisible.value = false
}

// Wir binden den Event-Listener global an das Window-Objekt
onMounted(() => {
  window.addEventListener('contextmenu', handleContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('contextmenu', handleContextMenu)
})
</script>

<style scoped>
:deep(.v-overlay__content) {
  position: fixed !important;
  margin: 0 !important;
}
</style>