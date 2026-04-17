<template>
  <!-- Flexbox Container, damit Text und Icon in einer Zeile bleiben -->
  <div class="d-flex align-center w-100">
    <!-- Der (ggf. abgeschnittene) Text -->
    <span>{{ truncatedValue }}</span>

    <!-- Tooltip & Icon: Wird nur gerendert, wenn der Text wirklich > 40 Zeichen ist -->
    <v-tooltip v-if="isTruncated" location="top" max-width="400">
      <template v-slot:activator="{ props: tooltipProps }">
        <!-- ml-auto drückt das Icon ganz nach rechts (rechtsbündig) -->
        <v-icon
          v-bind="tooltipProps"
          icon="mdi-information-outline"
          class="ml-auto cursor-pointer"
          size="small"
          color="grey"
        ></v-icon>
      </template>

      <!-- Der komplette Text, der beim Hovern angezeigt wird -->
      <span>{{ value }}</span>
    </v-tooltip>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{ value: string }>()

// Das Limit als Konstante definieren
const limit = 40

// 1. Prüfen, ob der Text überhaupt länger als das Limit ist
const isTruncated = computed(() => {
  return props.value && props.value.length > limit
})

// 2. Den abgeschnittenen Text generieren (mit Wortgrenzen-Erkennung)
const truncatedValue = computed(() => {
  if (!props.value) return ''
  if (!isTruncated.value) return props.value

  // Hole dir zuerst die exakt ersten 40 Zeichen
  const exactCut = props.value.substring(0, limit)

  // Finde die Position des letzten Leerzeichens innerhalb dieser 40 Zeichen
  const lastSpaceIndex = exactCut.lastIndexOf(' ')

  // Wenn ein Leerzeichen existiert (Index ist > 0), schneide dort sauber ab.
  // Falls nicht (Index ist -1), nimm einfach den harten Schnitt bei 40 Zeichen.
  if (lastSpaceIndex > 0) {
    return exactCut.substring(0, lastSpaceIndex) + '...'
  }

  return exactCut + '...'
})
</script>
