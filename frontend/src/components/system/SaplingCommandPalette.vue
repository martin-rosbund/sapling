<template>
  <v-dialog
    v-model="isOpen"
    width="640"
    max-width="640"
    transition="dialog-top-transition"
    scrollable
    content-class="sapling-overlay-content--top"
    @update:model-value="onDialogToggle"
  >
    <SaplingDialogCard class="sapling-command-palette" rounded="lg" :tilt="false">
      <div class="sapling-command-palette__search">
        <v-text-field
          ref="searchInputRef"
          v-model="query"
          :placeholder="t('global.commandPalette.placeholder')"
          density="comfortable"
          hide-details
          autofocus
          autocomplete="off"
          flat
          prepend-inner-icon="mdi-magnify"
          @keydown="onSearchKeydown"
        />
      </div>

      <v-divider />

      <SaplingCommandPaletteResults
        :is-loading="isLoading"
        :grouped-results="groupedResults"
        :active-index="activeIndex"
        :empty-label="t('global.commandPalette.empty')"
        @update-active-index="activeIndex = $event"
        @select-item="runItem"
      />

      <v-divider />

      <SaplingCommandPaletteFooter />
    </SaplingDialogCard>
  </v-dialog>
</template>

<script lang="ts" setup>
import '@/assets/styles/SaplingCommandPalette.css'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingCommandPaletteFooter from '@/components/system/command-palette/SaplingCommandPaletteFooter.vue'
import SaplingCommandPaletteResults from '@/components/system/command-palette/SaplingCommandPaletteResults.vue'
import { useSaplingCommandPalette } from '@/composables/system/useSaplingCommandPalette'

const { t } = useI18n()
const {
  isOpen,
  isLoading,
  query,
  activeIndex,
  groupedResults,
  openPalette,
  closePalette,
  onDialogToggle,
  moveActive,
  runItem,
  activateCurrent,
} = useSaplingCommandPalette()

const searchInputRef = ref<{ focus?: () => void } | null>(null)

function onKeyDown(event: KeyboardEvent) {
  if (event.repeat) {
    return
  }

  const isPaletteShortcut =
    (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k'
  const target = event.target as HTMLElement | null
  const isEditable =
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.isContentEditable === true
  const isSlashShortcut =
    event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditable

  if (!isPaletteShortcut && !isSlashShortcut) {
    return
  }

  event.preventDefault()
  void openPaletteAndFocus()
}

async function openPaletteAndFocus() {
  await openPalette()
  await nextTick()
  searchInputRef.value?.focus?.()
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void activateCurrent()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePalette()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>
