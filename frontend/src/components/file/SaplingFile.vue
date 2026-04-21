<template>
  <v-container class="pa-0 sapling-file-fullheight" density="compact" fluid>
    <section class="sapling-file-workspace">
      <aside class="sapling-file-workspace__sidebar glass-panel">
        <div class="sapling-file-workspace__table-shell">
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
        </div>
      </aside>

      <section class="sapling-file-workspace__detail">
        <SaplingFileHeader
          :selected-handle="selectedHandle"
          :selected-filename="selectedFilename"
          :preview-type="previewType"
          :has-selection="hasSelection"
          :is-loading="isLoading && !isInitialized"
          :on-download-document="onDownloadDocument"
        />

        <SaplingFileDetail
          :selected-handle="selectedHandle"
          :has-selection="hasSelection"
          :is-loading="isLoading && !isInitialized"
          :preview-component="previewComponent"
          :preview-props="previewProps"
        />
      </section>
    </section>
  </v-container>
</template>

<script lang="ts" setup>
import { BACKEND_URL, DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import type { SaplingGenericItem } from '@/entity/entity'
import { defineAsyncComponent, ref, computed, watch } from 'vue'
import SaplingFilePDF from './SaplingFilePDF.vue'
import SaplingFilePNG from './SaplingFilePNG.vue'
import SaplingFileJPEG from './SaplingFileJPEG.vue'
import SaplingFileNoPreview from './SaplingFileNoPreview.vue'
import SaplingFileDetail from './SaplingFileDetail.vue'
import SaplingFileJSON from './SaplingFileJSON.vue'
import SaplingFileHeader from './SaplingFileHeader.vue'
import SaplingFileMail from './SaplingFileMail.vue'

const SaplingTable = defineAsyncComponent(() => import('@/components/table/SaplingTable.vue'))
const props = defineProps<{ entityHandle: string }>()
const entityHandleRef = ref(props.entityHandle)

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
  isInitialized,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
  parentFilter,
} = useSaplingTable(entityHandleRef, DEFAULT_PAGE_SIZE_SMALL, true)

const selectedHandle = ref('')

const selectedMimeType = ref('')

const selectedFilename = ref('')

watch(
  () => props.entityHandle,
  (value) => {
    entityHandleRef.value = value
    clearSelection()
  },
)

const hasSelection = computed(() => selectedHandle.value.length > 0)

function getSelectedDocumentHandle(item?: SaplingGenericItem) {
  const handle = item?.handle
  return handle == null ? '' : String(handle)
}

function onSelectedDocument(val: SaplingGenericItem[]) {
  const nextItem = val[0] ?? null
  selectedHandle.value = getSelectedDocumentHandle(nextItem ?? undefined)
  selectedMimeType.value = nextItem?.mimetype || ''
  selectedFilename.value = nextItem?.filename || ''
}

function clearSelection() {
  selectedHandle.value = ''
  selectedMimeType.value = ''
  selectedFilename.value = ''
}

function onDownloadDocument() {
  if (!selectedHandle.value) return
  // Korrekte Backend-URL für Download
  const url = `${BACKEND_URL}document/download/${selectedHandle.value}`
  // Download als Datei auslösen
  const link = document.createElement('a')
  link.href = url
  link.download = ''
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const previewType = computed(() => getPreviewType(selectedMimeType.value, selectedFilename.value))

const previewComponent = computed(() => {
  if (previewType.value === 'pdf') return SaplingFilePDF
  if (previewType.value === 'png') return SaplingFilePNG
  if (previewType.value === 'jpeg') return SaplingFileJPEG
  if (previewType.value === 'json') return SaplingFileJSON
  if (previewType.value === 'eml') return SaplingFileMail
  return SaplingFileNoPreview
})

const previewProps = computed(() => {
  if (!selectedHandle.value) return {}
  if (previewType.value === 'pdf') {
    // PDF Vorschau-Endpunkt
    const url = `${BACKEND_URL}document/preview/${selectedHandle.value}`
    return { pdfUrl: url }
  }
  if (previewType.value === 'json') {
    const url = `${BACKEND_URL}document/download/${selectedHandle.value}`
    return { jsonUrl: url }
  }

  const url = `${BACKEND_URL}document/download/${selectedHandle.value}`
  if (previewType.value === 'png') return { pngUrl: url }
  if (previewType.value === 'jpeg') return { jpegUrl: url }
  if (previewType.value === 'eml') {
    return {
      mailUrl: url,
      fileName: selectedFilename.value,
    }
  }

  return {}
})

function getPreviewType(mimetype: string, filename: string) {
  const normalizedMimeType = (mimetype || '').toLowerCase()
  const normalizedFilename = (filename || '').toLowerCase()

  if (normalizedMimeType === 'application/pdf') return 'pdf'
  if (normalizedMimeType === 'image/png') return 'png'
  if (normalizedMimeType === 'image/jpeg' || normalizedMimeType === 'image/jpg') return 'jpeg'
  if (normalizedMimeType === 'application/json') return 'json'
  if (isEmlFile(normalizedMimeType, normalizedFilename)) return 'eml'
  return 'none'
}

function isEmlFile(mimetype: string, filename: string) {
  return mimetype === 'message/rfc822' || filename.endsWith('.eml')
}
</script>
