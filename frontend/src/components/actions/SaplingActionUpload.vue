<template>
  <v-card-actions>
    <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
    </v-btn>
    <v-spacer/>
    <v-btn color="primary" append-icon="mdi-content-save" @click="onUpload" :loading="loading" :disabled="loading">
      <template v-if="loading">
        <v-progress-circular indeterminate color="white" size="20" class="mr-2" />
        {{ $t('global.upload') }}
      </template>
      <template v-else-if="$vuetify.display.mdAndUp">
        {{ $t('global.upload') }}
      </template>
    </v-btn>
  </v-card-actions>
</template>

<script lang="ts" setup>
defineProps<{ loading: boolean }>();
const emit = defineEmits(['close', 'upload']);

function onUpload() {
  emit('upload');
}
</script>
