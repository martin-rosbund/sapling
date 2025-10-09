<template>
  <v-navigation-drawer v-model="drawer" app temporary>
    <v-list>
      <v-list-item>
        <v-list-item-title>Stammdaten</v-list-item-title>
        <v-list-item @click="$router.push('/company')">
          <v-list-item-title>Firmen</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$router.push('/person')">
          <v-list-item-title>Personen</v-list-item-title>
        </v-list-item>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Prozesse</v-list-item-title>
        <v-list-item @click="$router.push('/ticket')">
          <v-list-item-title>Ticket</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$router.push('/calendar')">
          <v-list-item-title>Kalender</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$router.push('/note')">
          <v-list-item-title>Notizen</v-list-item-title>
        </v-list-item>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>Administration</v-list-item-title>
        <v-list-item @click="$router.push('/right')">
          <v-list-item-title>Rechte und Rollen</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$router.push('/translation')">
          <v-list-item-title>Übersetzungen</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$router.push('/entity')">
          <v-list-item-title>Seiten</v-list-item-title>
        </v-list-item>
        <v-list-item @click="openSwagger()">
          <v-list-item-title>API Zugriff</v-list-item-title>
        </v-list-item>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import { ref, watch, defineProps, defineEmits } from 'vue'

  const props = defineProps({
    modelValue: Boolean
  })
  const emit = defineEmits(['update:modelValue'])

  const drawer = ref(props.modelValue)
  watch(() => props.modelValue, val => drawer.value = val)
  watch(drawer, val => emit('update:modelValue', val))

  const swagger = import.meta.env.VITE_BACKEND_URL + 'swagger'
  const openSwagger = () => {
    window.open(swagger, '_blank')
  }
</script>