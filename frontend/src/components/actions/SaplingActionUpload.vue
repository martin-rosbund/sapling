<template>
  <v-card-actions>
    <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
    </v-btn>
    <v-spacer/>
    <v-btn color="primary" append-icon="mdi-content-save" @click="onUpload" :loading="isLoading" :disabled="isLoading">
      <template v-if="$vuetify.display.mdAndUp">
        {{ $t('global.upload') }}
      </template>
    </v-btn>
  </v-card-actions>
</template>

<script lang="ts" setup>
defineProps<{ isLoading: boolean }>();
const emit = defineEmits(['close', 'upload']);

function onUpload() {
  emit('upload');
}
</script>
