<template>
  <div class="sapling-document-header d-flex align-center justify-space-between mt-3 mb-2">
    <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto sapling-skeleton-fullheight"
        elevation="12"
        type="text"/>
        <template v-else>
            <div class="d-flex align-center">
            <v-icon class="mr-2" size="28">mdi-eye</v-icon>
            <span class="sapling-document-title font-weight-medium">{{ $t('document.preview') }}</span>
            </div>
            <v-btn
            :disabled="!selectedHandle"
            class="sapling-document-download-btn glass-panel"
            @click="onDownloadDocument"
            min-width="0"
            style="width:auto; padding: 0 16px;"
            text>
            <v-icon class="mr-1" size="20">mdi-download</v-icon>
            {{ $t('global.download') }}
            </v-btn>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { useSaplingFileHeader } from '@/composables/file/useSaplingFileHeader';

defineProps<{
  selectedHandle: string;
  onDownloadDocument: () => void;
}>();

const { isLoading } = useSaplingFileHeader();
</script>

<style scoped src="@/assets/styles/SaplingFileHeaderScoped.css"></style>
