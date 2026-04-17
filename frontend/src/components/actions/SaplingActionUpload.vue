<template>
  <div class="sapling-dialog__footer">
    <v-card-actions class="sapling-dialog__actions">
      <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        append-icon="mdi-content-save"
        @click="onUpload"
        :loading="isLoading"
        :disabled="isLoading"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('global.upload') }}
        </template>
      </v-btn>
    </v-card-actions>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ isLoading: boolean }>()
const emit = defineEmits(['close', 'upload'])

function onUpload() {
  emit('upload')
}
</script>
