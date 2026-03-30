<template>
  <v-container class="pa-0 sapling-file-fullheight" density="compact" fluid>
    <v-row class="fill-height" density="compact">
      <!-- Tabelle -->
      <v-col cols="12" md="5">
        <v-card flat>
          <v-card-text class="pa-0 flex-grow-1">
            <div class="sapling-document-table-scroll">
              <SaplingTable
                :items="items"
                :search="search ?? ''"
                :page="page"
                :items-per-page="itemsPerPage"
                :total-items="totalItems"
                :is-loading="isLoading"
                :sort-by="sortBy"
                :column-filters="columnFilters"
                :active-filter="activeFilter"
                :entity-handle="entity?.handle || ''"
                :entity="entity"
                :entity-permission="entityPermission"
                :entity-templates="entityTemplates || []"
                :show-actions="true"
                :multi-select="false"
                :parent-filter="parentFilter"
                :table-key="entityHandleRef + '-table'"
                @update:selected="onSelectedDocument"
                @update:search="onSearchUpdate"
                @update:page="onPageUpdate"
                @update:items-per-page="onItemsPerPageUpdate"
                @update:sort-by="onSortByUpdate"
                @update:column-filters="onColumnFiltersUpdate"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Detailfenster -->
      <v-col cols="12" md="7" class="d-flex flex-column">
        <SaplingFileHeader
          :selectedHandle="selectedHandle"
          :onDownloadDocument="onDownloadDocument"
        />
        <SaplingFileDetail
          :selectedHandle="selectedHandle"
          :onDownloadDocument="onDownloadDocument"
          :previewComponent="previewComponent"
          :previewProps="previewProps"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { BACKEND_URL, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
import type { SaplingGenericItem } from '@/entity/entity';
import { defineAsyncComponent, ref, computed } from 'vue';
import SaplingFilePDF from './SaplingFilePDF.vue';
import SaplingFilePNG from './SaplingFilePNG.vue';
import SaplingFileJPEG from './SaplingFileJPEG.vue';
import SaplingFileNoPreview from './SaplingFileNoPreview.vue';
import SaplingFileDetail from './SaplingFileDetail.vue';
import SaplingFileJSON from './SaplingFileJSON.vue';
import SaplingFileHeader from './SaplingFileHeader.vue';

const SaplingTable = defineAsyncComponent(() => import('@/components/table/SaplingTable.vue'));
const props = defineProps<{ entityHandle: string }>();
const entityHandleRef = ref(props.entityHandle);

const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  columnFilters,
  activeFilter,
  entityTemplates,
  entity,
  entityPermission,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
  parentFilter,
} = useSaplingTable(entityHandleRef, DEFAULT_PAGE_SIZE_SMALL, true);

const selectedHandle = ref('');

const selectedMimeType = ref('');

function onSelectedDocument(val: SaplingGenericItem[]) {
  selectedHandle.value = val[0]?.handle || '';
  selectedMimeType.value = val[0]?.mimetype || '';
  // Kein automatischer Download für PDFs oder andere Dateitypen!
}

function onDownloadDocument() {
  if (!selectedHandle.value) return;
  // Korrekte Backend-URL für Download
  const url = `${BACKEND_URL}document/download/${selectedHandle.value}`;
  // Download als Datei auslösen
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const previewComponent = computed(() => {
  if (!selectedMimeType.value) return SaplingFileNoPreview;
  if (selectedMimeType.value === 'application/pdf') return SaplingFilePDF;
  if (selectedMimeType.value === 'image/png') return SaplingFilePNG;
  if (selectedMimeType.value === 'image/jpeg') return SaplingFileJPEG;
  if (selectedMimeType.value === 'application/json') return SaplingFileJSON;
  return SaplingFileNoPreview;
});

const previewProps = computed(() => {
  if (!selectedHandle.value) return {};
  if (selectedMimeType.value === 'application/pdf') {
    // PDF Vorschau-Endpunkt
    const url = `${BACKEND_URL}document/preview/${selectedHandle.value}`;
    return { pdfUrl: url };
  }
  if (selectedMimeType.value === 'application/json') {
    const url = `${BACKEND_URL}document/download/${selectedHandle.value}`;
    return { jsonUrl: url };
  }
  const url = `${BACKEND_URL}document/download/${selectedHandle.value}`;
  if (selectedMimeType.value === 'image/png') return { pngUrl: url };
  if (selectedMimeType.value === 'image/jpeg') return { jpegUrl: url };
  return {};
});
</script>

<style scoped>
.sapling-file-fullheight {
  min-height: calc(100dvh - 140px);
  height: calc(100dvh - 140px);
}

.sapling-document-table-scroll,
.sapling-document-detail-scroll {
  height: 100%;
  overflow-y: auto;
}
</style>
