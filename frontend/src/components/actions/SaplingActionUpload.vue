<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="$emit('close')">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
      </v-btn>
    </template>

    <template #trailing>
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
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

defineProps<{ isLoading: boolean }>()
const emit = defineEmits(['close', 'upload'])

function onUpload() {
  emit('upload')
}
</script>
