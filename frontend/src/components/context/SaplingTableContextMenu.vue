<template>
  <v-menu
    v-model="menuVisible"
    :style="{ top: `${y}px`, left: `${x}px` }"
    absolute
    transition="slide-y-transition"
  >
    <v-list density="compact" elevation="8" min-width="200" class="glass-panel">
      <v-list-item v-if="canEdit" prepend-icon="mdi-pencil" :title="$t('global.edit')" @click="emitAction('edit')">
      </v-list-item>
      <v-list-item v-else prepend-icon="mdi-eye" :title="$t('global.show')" @click="emitAction('show')">
      </v-list-item>
      <v-list-item v-if="canDelete" prepend-icon="mdi-delete" :title="$t('global.delete')" @click="emitAction('delete')">
      </v-list-item>
      <v-list-item v-if="canNavigate" prepend-icon="mdi-navigation" :title="$t('global.navigate')" @click="emitAction('navigate')">
      </v-list-item>
      <v-list-item prepend-icon="mdi-content-copy" :title="$t('global.copy')" @click="emitAction('copy')">
      </v-list-item>
      <v-list-item prepend-icon="mdi-close" :title="$t('global.close')" @click="menuVisible = false">
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
import type { SaplingGenericItem } from '@/entity/entity';
import { ref, watch } from 'vue'

const props = defineProps<{
  canEdit: boolean
  canDelete: boolean
  canNavigate: boolean
  item: SaplingGenericItem | null
  show: boolean
  x: number
  y: number
}>()
const emit = defineEmits(['action', 'update:show'])

const menuVisible = ref(props.show)
const x = ref(props.x)
const y = ref(props.y)

watch(() => props.show, v => (menuVisible.value = v))
watch(() => props.x, v => (x.value = v))
watch(() => props.y, v => (y.value = v))

watch(menuVisible, v => {
  emit('update:show', v)
  if (v) {
    window.dispatchEvent(new CustomEvent('sapling-contextmenu-open'))
  }
})

function onGlobalMenuOpen() {
  // Only close if this menu is open
  if (menuVisible.value) menuVisible.value = false
}

window.addEventListener('sapling-contextmenu-open', onGlobalMenuOpen)

function emitAction(type: string) {
  emit('action', { type, item: props.item })
  menuVisible.value = false
}

import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('sapling-contextmenu-open', onGlobalMenuOpen)
})
</script>

<style scoped>
:deep(.v-overlay__content) {
  position: fixed !important;
  margin: 0 !important;
}
</style>
