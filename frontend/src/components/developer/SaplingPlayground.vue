<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--scroll sapling-page-shell--uniform-inset sapling-playground"
    fluid
  >
    <v-row>
      <v-col cols="12">
        <v-card elevation="1" class="glass-panel sapling-playground__hero-card">
          <v-card-text class="sapling-playground__hero-content">
            <div class="sapling-playground__hero-copy">
              <span class="sapling-playground__eyebrow">Component Showcase</span>
              <h1 class="sapling-playground__hero-title">Sapling Playground</h1>
              <p class="sapling-playground__hero-description">
                Interaktive Showcase-Flaeche fuer Actions, Dialoge, Form-Felder, KPI-Karten und
                Tabellen. Alles hier ist direkt anklickbar und als Referenz fuer die uebrigen
                Komponenten gedacht.
              </p>

              <div class="sapling-playground__hero-actions">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-form-select"
                  :disabled="!canOpenEditDialog"
                  @click="openEditShowcaseDialog"
                >
                  Edit-Dialog oeffnen
                </v-btn>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-email-fast-outline"
                  @click="openMailShowcaseDialog"
                >
                  Mail-Dialog starten
                </v-btn>
              </div>
            </div>

            <div class="sapling-playground__metric-grid">
              <div
                v-for="metric in playgroundMetrics"
                :key="metric.label"
                class="sapling-playground__metric glass-panel"
              >
                <span class="sapling-playground__metric-label">{{ metric.label }}</span>
                <strong class="sapling-playground__metric-value">{{ metric.value }}</strong>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" xl="8">
        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__showcase-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-text class="sapling-playground__showcase-body">
            <div class="sapling-playground__showcase-header">
              <div>
                <span class="sapling-playground__eyebrow">Actions</span>
                <h2 class="sapling-playground__showcase-title">Action Gallery</h2>
              </div>
              <p class="sapling-playground__showcase-description">
                Alle Footer- und Workflow-Actions direkt im Einsatz. Die Buttons feuern Demo-Handler
                und zeigen ihre aktuellen Zustaende.
              </p>
            </div>

            <v-row>
              <v-col v-for="actionCard in actionShowcases" :key="actionCard.key" cols="12" md="6">
                <div class="sapling-playground__demo-frame glass-panel">
                  <div class="sapling-playground__demo-copy">
                    <h3 class="sapling-playground__demo-title">{{ actionCard.title }}</h3>
                    <p class="sapling-playground__demo-description">{{ actionCard.description }}</p>
                  </div>

                  <div class="sapling-playground__demo-surface glass-panel">
                    <component
                      :is="actionCard.component"
                      v-bind="actionCard.props"
                      v-on="actionCard.listeners ?? {}"
                    />
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__showcase-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-text class="sapling-playground__showcase-body">
            <div
              class="sapling-playground__showcase-header sapling-playground__showcase-header--stacked"
            >
              <div>
                <span class="sapling-playground__eyebrow">Dialogs</span>
                <h2 class="sapling-playground__showcase-title">Launchpad</h2>
              </div>
              <p class="sapling-playground__showcase-description">
                Jeder Dialog laesst sich ueber einen eigenen Trigger oeffnen. Damit ist der
                Playground auch eine schnelle QA-Flaeche.
              </p>
            </div>

            <div class="sapling-playground__launchpad-grid">
              <v-btn
                v-for="launcher in dialogLaunchers"
                :key="launcher.key"
                class="sapling-playground__launchpad-button"
                :color="launcher.color"
                :prepend-icon="launcher.icon"
                :variant="launcher.disabled ? 'outlined' : 'flat'"
                :disabled="launcher.disabled"
                @click="launcher.open"
              >
                {{ launcher.title }}
              </v-btn>
            </div>

            <div class="sapling-playground__launchpad-notes">
              <div
                v-for="launcher in dialogLaunchers"
                :key="`${launcher.key}-note`"
                class="sapling-playground__launchpad-note glass-panel"
              >
                <strong>{{ launcher.title }}</strong>
                <span>{{ launcher.description }}</span>
              </div>
            </div>

            <v-alert class="mt-4" type="info" variant="tonal">
              Edit- und Mail-Demos nutzen aktuell <strong>{{ showcaseEntityHandle }}</strong> als
              Kontext. Verfuegbare Templates: <strong>{{ entityTemplates.length }}</strong
              >.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Text Fields</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-short-text-field
                  label="Short Text Field"
                  :model-value="shortTextFieldValue"
                  :disabled="false"
                  @update:model-value="setShortTextFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-long-text-field
                  label="Long Text Field"
                  :model-value="longTextFieldValue"
                  :disabled="false"
                  @update:model-value="setLongTextFieldValue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Markdown Field</v-card-title>
          <v-card-text>
            <sapling-markdown-field
              label="Markdown Feld"
              :model-value="markdownFieldValue"
              :rows="8"
              :show-preview="true"
              @update:model-value="setMarkdownFieldValue"
            />
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Contact Fields</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="4">
                <sapling-phone-field
                  label="Phone Field"
                  :model-value="phoneFieldValue"
                  :disabled="false"
                  @update:model-value="setPhoneFieldValue"
                  placeholder="Enter phone number"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <sapling-mail-field
                  label="Mail Field"
                  :model-value="mailFieldValue"
                  :disabled="false"
                  @update:model-value="setMailFieldValue"
                  placeholder="Enter email address"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <sapling-link-field
                  label="Link Field"
                  :model-value="linkFieldValue"
                  :disabled="false"
                  @update:model-value="setLinkFieldValue"
                  placeholder="Enter URL"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Other Fields</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-boolean-field
                  label="Boolean Field"
                  :model-value="booleanFieldValue"
                  :disabled="false"
                  @update:model-value="setBooleanFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-color-field
                  label="Color Field"
                  :model-value="colorFieldValue"
                  :disabled="false"
                  @update:model-value="setColorFieldValue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Numbers & Dates</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-number-field
                  label="Number Field"
                  :model-value="numberFieldValue"
                  :disabled="false"
                  @update:model-value="setNumberFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-date-type-field
                  label="Date Field"
                  :model-value="dateTypeFieldValue"
                  :disabled="false"
                  @update:model-value="setDateTypeFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <SaplingFieldMoney
                  label="Money Field"
                  :model-value="moneyFieldValue"
                  :disabled="false"
                  @update:model-value="setMoneyFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <SaplingFieldPercent
                  label="Percent Field"
                  :model-value="percentFieldValue"
                  :disabled="false"
                  @update:model-value="setPercentFieldValue"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-time-field
                  label="Time Field"
                  :model-value="timeFieldValue"
                  :disabled="false"
                  @update:model-value="setTimeFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-date-time-field
                  label="DateTime Field"
                  :date-value="dateTimeDateValue"
                  :time-value="dateTimeTimeValue"
                  :disabled="false"
                  @update:date-value="setDateTimeDateValue"
                  @update:time-value="setDateTimeTimeValue"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Icon Selection</v-card-title>
          <v-card-text>
            <sapling-icon-field
              label="Icon Field"
              :items="iconFieldItems"
              :model-value="iconFieldValue"
              :disabled="false"
              @update:model-value="setIconFieldValue"
            />
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">Select Field</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-select-field label="Multi Select Field" entity-handle="company" />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-single-select-field label="Single Select Field" entity-handle="company" />
              </v-col>
              <v-col cols="12" sm="12">
                <SaplingSingleSelectAddField
                  :label="'Single Select Transfer Field'"
                  :entityHandle="'company'"
                />
              </v-col>
              <v-col cols="12" sm="12">
                <SaplingSelectAddField
                  :label="'Multi Select Transfer Field'"
                  :entityHandle="'company'"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-skeleton-loader
          v-if="kpiItemLoadling || isPlaygroundLoading"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"
        />
        <SaplingKpiCard v-else :kpi="kpiItem" :kpiIdx="1" />
      </v-col>
      <v-col cols="12" md="6">
        <v-skeleton-loader
          v-if="kpiListLoadling || isPlaygroundLoading"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"
        />
        <SaplingKpiCard v-else :kpi="kpiList" :kpiIdx="3" />
      </v-col>
      <v-col cols="12" md="6">
        <v-skeleton-loader
          v-if="kpiTrendLoadling || isPlaygroundLoading"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"
        />
        <SaplingKpiCard v-else :kpi="kpiTrend" :kpiIdx="7" />
      </v-col>
      <v-col cols="12" md="6">
        <v-skeleton-loader
          v-if="kpiSparklineLoadling || isPlaygroundLoading"
          elevation="12"
          class="fill-height glass-panel"
          type="paragraph"
        />
        <SaplingKpiCard v-else :kpi="kpiSparkline" :kpiIdx="9" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-playground__content-card"
          id="playground-data-surfaces"
        >
          <v-card-title class="text-h6">Search and Table</v-card-title>
          <v-card-text>
            <sapling-table
              entity-handle="company"
              :items="items"
              :search="search"
              :page="page"
              :items-per-page="itemsPerPage"
              :total-items="totalItems"
              :is-loading="isTableLoading"
              :sort-by="sortBy"
              :column-filters="columnFilters"
              :active-filter="activeFilter"
              :entity-templates="entityTemplates"
              :entity="entity"
              :entity-permission="entityPermission"
              :show-actions="true"
              :multi-select="false"
              table-key="company"
              @update:page="onPageUpdate"
              @update:items-per-page="onItemsPerPageUpdate"
              @update:sort-by="onSortByUpdate"
              @update:column-filters="onColumnFiltersUpdate"
              @update:search="onSearchUpdate"
              @reload="loadData"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <SaplingDialogDelete
      :model-value="deleteDialogModel"
      :item="deleteDialogItem"
      @update:model-value="deleteDialogModel = $event"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />

    <SaplingDialogFavorite
      :add-favorite-dialog="favoriteDialogModel"
      :new-favorite-title="favoriteTitle"
      :selected-favorite-entity="selectedFavoriteEntity"
      :entity-options="favoriteEntityOptions"
      @update:add-favorite-dialog="favoriteDialogModel = $event"
      @update:new-favorite-title="favoriteTitle = $event"
      @update:selected-favorite-entity="selectedFavoriteEntity = $event"
      @addFavorite="handleFavoriteAdd"
    />

    <SaplingDialogKpi
      :add-kpi-dialog="kpiDialogModel"
      :selected-kpi="selectedKpi"
      :available-kpis="availableKpiOptions"
      :validate-and-add-kpi="handleKpiAdd"
      :close-dialog="closeKpiDialog"
      @update:add-kpi-dialog="kpiDialogModel = $event"
      @update:selected-kpi="selectedKpi = $event"
    />

    <SaplingDialogEdit
      :model-value="editDialogModel"
      :mode="editDialogMode"
      :item="editDialogItem"
      :entity="entity"
      :templates="entityTemplates"
      @update:model-value="editDialogModel = $event"
      @save="handleEditSave"
      @cancel="handleEditCancel"
    />

    <v-snackbar v-model="demoFeedbackVisible" :color="demoFeedbackColor" location="bottom right">
      {{ demoFeedbackMessage }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, markRaw, ref, type Component } from 'vue'
import SaplingActionAccount from '@/components/actions/SaplingActionAccount.vue'
import SaplingActionChangePassword from '@/components/actions/SaplingActionChangePassword.vue'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingActionDelete from '@/components/actions/SaplingActionDelete.vue'
import SaplingActionLogin from '@/components/actions/SaplingActionLogin.vue'
import SaplingActionMail from '@/components/actions/SaplingActionMail.vue'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingActionUpload from '@/components/actions/SaplingActionUpload.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingDialogFavorite from '@/components/dialog/SaplingDialogFavorite.vue'
import SaplingDialogKpi from '@/components/dialog/SaplingDialogKpi.vue'
import SaplingBooleanField from '@/components/dialog/fields/SaplingFieldBoolean.vue'
import SaplingColorField from '@/components/dialog/fields/SaplingFieldColor.vue'
import SaplingDateTimeField from '@/components/dialog/fields/SaplingFieldDateTime.vue'
import SaplingDateTypeField from '@/components/dialog/fields/SaplingFieldDateType.vue'
import SaplingFieldMoney from '@/components/dialog/fields/SaplingFieldMoney.vue'
import SaplingFieldPercent from '@/components/dialog/fields/SaplingFieldPercent.vue'
import SaplingIconField from '@/components/dialog/fields/SaplingFieldIcon.vue'
import SaplingLinkField from '@/components/dialog/fields/SaplingFieldLink.vue'
import SaplingLongTextField from '@/components/dialog/fields/SaplingFieldLongText.vue'
import SaplingMailField from '@/components/dialog/fields/SaplingFieldMail.vue'
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue'
import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue'
import SaplingPhoneField from '@/components/dialog/fields/SaplingFieldPhone.vue'
import SaplingShortTextField from '@/components/dialog/fields/SaplingFieldShortText.vue'
import SaplingSingleSelectAddField from '@/components/dialog/fields/SaplingFieldSingleSelectAdd.vue'
import SaplingSingleSelectField from '@/components/dialog/fields/SaplingFieldSingleSelect.vue'
import SaplingTimeField from '@/components/dialog/fields/SaplingFieldTime.vue'
import SaplingKpiCard from '@/components/kpi/SaplingKpiCard.vue'
import SaplingTable from '@/components/table/SaplingTable.vue'
import { useSaplingPlayground } from '@/composables/developer/useSaplingPlayground'
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import { useSaplingPhoneDialog } from '@/composables/dialog/useSaplingPhoneDialog'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { TILT_SOFT_OPTIONS } from '@/constants/tilt.constants'
import type { EntityItem, KPIItem, SaplingGenericItem } from '@/entity/entity'
import type { DialogSaveAction, DialogState } from '@/entity/structure'

const SaplingSelectAddField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldSelectAdd.vue'),
)
const SaplingSelectField = defineAsyncComponent(
  () => import('@/components/dialog/fields/SaplingFieldSelect.vue'),
)

type ShowcaseActionCard = {
  key: string
  title: string
  description: string
  component: Component
  props: Record<string, unknown>
  listeners?: Record<string, (...args: unknown[]) => void>
}

type ShowcaseDialogLauncher = {
  key: string
  title: string
  description: string
  icon: string
  color: string
  disabled?: boolean
  open: () => void
}

const {
  booleanFieldValue,
  setBooleanFieldValue,
  colorFieldValue,
  setColorFieldValue,
  shortTextFieldValue,
  setShortTextFieldValue,
  longTextFieldValue,
  setLongTextFieldValue,
  numberFieldValue,
  setNumberFieldValue,
  moneyFieldValue,
  setMoneyFieldValue,
  percentFieldValue,
  setPercentFieldValue,
  dateTypeFieldValue,
  setDateTypeFieldValue,
  timeFieldValue,
  setTimeFieldValue,
  dateTimeDateValue,
  setDateTimeDateValue,
  dateTimeTimeValue,
  setDateTimeTimeValue,
  phoneFieldValue,
  setPhoneFieldValue,
  mailFieldValue,
  setMailFieldValue,
  linkFieldValue,
  setLinkFieldValue,
  iconFieldItems,
  iconFieldValue,
  setIconFieldValue,
  kpiItem,
  kpiList,
  kpiTrend,
  kpiSparkline,
  kpiItemLoadling,
  kpiListLoadling,
  kpiTrendLoadling,
  kpiSparklineLoadling,
  markdownFieldValue,
  setMarkdownFieldValue,
  isLoading: isPlaygroundLoading,
} = useSaplingPlayground()

const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading: isTableLoading,
  sortBy,
  columnFilters,
  activeFilter,
  entityTemplates,
  entity,
  entityPermission,
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
} = useSaplingTable(ref('salesOpportunity'))

const { openMailDialog } = useSaplingMailDialog()
const { openPhoneDialog } = useSaplingPhoneDialog()

const demoFeedbackVisible = ref(false)
const demoFeedbackMessage = ref('')
const demoFeedbackColor = ref('primary')

const deleteDialogModel = ref(false)
const deleteDialogItem = ref<SaplingGenericItem | null>({
  handle: 101,
  name: 'Playground Record',
})

const favoriteDialogModel = ref(false)
const favoriteTitle = ref('Pipeline Board')
const selectedFavoriteEntity = ref<EntityItem | null>(null)

const kpiDialogModel = ref(false)
const selectedKpi = ref<KPIItem | null>(null)

const editDialogModel = ref(false)
const editDialogMode = ref<DialogState>('create')
const editDialogItem = ref<SaplingGenericItem | null>(null)

const fallbackFavoriteEntities: EntityItem[] = [
  {
    handle: 'company',
    icon: 'mdi-domain',
    canRead: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true,
    canShow: true,
    createdAt: null,
  },
  {
    handle: 'person',
    icon: 'mdi-account',
    canRead: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true,
    canShow: true,
    createdAt: null,
  },
]

const favoriteEntityOptions = computed(() => {
  const loadedEntity = entity.value

  if (!loadedEntity) {
    return fallbackFavoriteEntities
  }

  return [
    loadedEntity,
    ...fallbackFavoriteEntities.filter((option) => option.handle !== loadedEntity.handle),
  ]
})

const availableKpiOptions = computed(() => {
  return [kpiItem.value, kpiList.value, kpiTrend.value, kpiSparkline.value].filter(
    (kpi): kpi is KPIItem => kpi != null,
  )
})

const showcaseEntityHandle = computed(() => entity.value?.handle ?? 'company')
const canOpenEditDialog = computed(() => entity.value != null && entityTemplates.value.length > 0)
const canOpenKpiDialog = computed(() => availableKpiOptions.value.length > 0)

function pushDemoFeedback(message: string, color = 'primary') {
  demoFeedbackMessage.value = message
  demoFeedbackColor.value = color
  demoFeedbackVisible.value = false
  demoFeedbackVisible.value = true
}

function openDeleteShowcaseDialog() {
  deleteDialogModel.value = true
}

function handleDeleteConfirm() {
  deleteDialogModel.value = false
  pushDemoFeedback('Delete-Dialog bestaetigt.', 'warning')
}

function handleDeleteCancel() {
  deleteDialogModel.value = false
  pushDemoFeedback('Delete-Dialog geschlossen.', 'info')
}

function openFavoriteShowcaseDialog() {
  if (!selectedFavoriteEntity.value) {
    selectedFavoriteEntity.value = favoriteEntityOptions.value[0] ?? null
  }

  favoriteDialogModel.value = true
}

function handleFavoriteAdd() {
  const title = favoriteTitle.value.trim() || selectedFavoriteEntity.value?.handle || 'Favorit'
  favoriteDialogModel.value = false
  pushDemoFeedback(`Favorit gespeichert: ${title}`, 'success')
}

function openKpiShowcaseDialog() {
  if (!canOpenKpiDialog.value) {
    return
  }

  if (!selectedKpi.value) {
    selectedKpi.value = availableKpiOptions.value[0] ?? null
  }

  kpiDialogModel.value = true
}

function closeKpiDialog() {
  kpiDialogModel.value = false
}

function handleKpiAdd() {
  kpiDialogModel.value = false
  pushDemoFeedback(`KPI verknuepft: ${selectedKpi.value?.name ?? 'Unbekannt'}`, 'success')
}

function openEditShowcaseDialog() {
  if (!canOpenEditDialog.value) {
    return
  }

  editDialogMode.value = 'create'
  editDialogItem.value = null
  editDialogModel.value = true
}

function handleEditSave(_value: SaplingGenericItem, action: DialogSaveAction) {
  pushDemoFeedback(`Edit-Dialog ausgefuehrt: ${action}`, 'success')
}

function handleEditCancel() {
  pushDemoFeedback('Edit-Dialog geschlossen.', 'info')
}

function openMailShowcaseDialog() {
  openMailDialog({
    entityHandle: showcaseEntityHandle.value,
    itemHandle: 1,
    initialTo: [mailFieldValue.value || 'demo@sapling.local'],
    initialSubject: 'Sapling Playground Showcase',
    draftValues: {
      email: mailFieldValue.value,
      link: linkFieldValue.value,
    },
  })
}

function openPhoneShowcaseDialog() {
  openPhoneDialog({
    phoneNumber: phoneFieldValue.value || '+49 30 1234567',
    entityHandle: showcaseEntityHandle.value,
    itemHandle: 1,
    draftValues: {
      phone: phoneFieldValue.value,
    },
  })
}

const actionShowcases: ShowcaseActionCard[] = [
  {
    key: 'save',
    title: 'Save',
    description: 'Standard Save-Footer inklusive Save-and-Close-Aktion.',
    component: markRaw(SaplingActionSave),
    props: {
      cancel: () => pushDemoFeedback('Cancel aus Save-Action.', 'info'),
      save: () => pushDemoFeedback('Save aus Save-Action.', 'success'),
      saveAndClose: () => pushDemoFeedback('Save and Close aus Save-Action.', 'success'),
    },
  },
  {
    key: 'delete',
    title: 'Delete',
    description: 'Destruktive Bestaetigungsaktion fuer Delete-Dialoge.',
    component: markRaw(SaplingActionDelete),
    props: {
      handleCancel: () => pushDemoFeedback('Delete abgebrochen.', 'info'),
      handleConfirm: () => pushDemoFeedback('Delete bestaetigt.', 'warning'),
    },
  },
  {
    key: 'close',
    title: 'Close',
    description: 'Minimaler Footer fuer Readonly- oder Preview-Screens.',
    component: markRaw(SaplingActionClose),
    props: {
      close: () => pushDemoFeedback('Close-Aktion ausgelost.', 'info'),
    },
  },
  {
    key: 'login',
    title: 'Login',
    description: 'Login-Footer mit optionalen Social-Providern.',
    component: markRaw(SaplingActionLogin),
    props: {
      handleAzure: () => pushDemoFeedback('Azure Login gestartet.', 'primary'),
      handleGoogle: () => pushDemoFeedback('Google Login gestartet.', 'primary'),
      handleLogin: () => pushDemoFeedback('Lokaler Login gestartet.', 'success'),
      isLoading: false,
    },
  },
  {
    key: 'mail',
    title: 'Mail',
    description: 'Mail-Workflow mit Preview-Refresh und Versand-Trigger.',
    component: markRaw(SaplingActionMail),
    props: {
      close: () => pushDemoFeedback('Mail-Dialog geschlossen.', 'info'),
      refreshPreview: () => pushDemoFeedback('Mail-Preview aktualisiert.', 'primary'),
      send: () => pushDemoFeedback('Mail-Versand ausgelost.', 'success'),
      isPreviewLoading: false,
      isSending: false,
    },
  },
  {
    key: 'upload',
    title: 'Upload',
    description: 'Upload-Footer fuer Dateidialoge mit Event-API.',
    component: markRaw(SaplingActionUpload),
    props: {
      isLoading: false,
    },
    listeners: {
      close: () => pushDemoFeedback('Upload geschlossen.', 'info'),
      upload: () => pushDemoFeedback('Upload gestartet.', 'success'),
    },
  },
  {
    key: 'account',
    title: 'Account',
    description: 'Kombinierte Footer-Aktion fuer Account-Dialoge.',
    component: markRaw(SaplingActionAccount),
    props: {
      handleClose: () => pushDemoFeedback('Account-Dialog geschlossen.', 'info'),
      handleChangePassword: () => pushDemoFeedback('Passwortwechsel ausgelost.', 'primary'),
      handleLogout: () => pushDemoFeedback('Logout ausgelost.', 'warning'),
    },
  },
  {
    key: 'change-password',
    title: 'Change Password',
    description: 'Spezialisierte Action fuer Passwortwechsel-Flaechen.',
    component: markRaw(SaplingActionChangePassword),
    props: {
      allowCancel: true,
      closeDialog: () => pushDemoFeedback('Passwort-Dialog geschlossen.', 'info'),
      handlePasswordChange: () => pushDemoFeedback('Passwortwechsel bestaetigt.', 'success'),
    },
  },
]

const dialogLaunchers = computed<ShowcaseDialogLauncher[]>(() => [
  {
    key: 'delete',
    title: 'Delete Dialog',
    description: 'Kompakter Danger-Dialog fuer Loesch-Workflows.',
    icon: 'mdi-delete-outline',
    color: 'error',
    open: openDeleteShowcaseDialog,
  },
  {
    key: 'favorite',
    title: 'Favorite Dialog',
    description: 'Speichert einen Favoriten mit Titel und Entity-Auswahl.',
    icon: 'mdi-star-outline',
    color: 'primary',
    open: openFavoriteShowcaseDialog,
  },
  {
    key: 'kpi',
    title: 'KPI Dialog',
    description: 'Verknuepft eine KPI aus den geladenen Beispielkarten.',
    icon: 'mdi-chart-box-outline',
    color: 'primary',
    disabled: !canOpenKpiDialog.value,
    open: openKpiShowcaseDialog,
  },
  {
    key: 'edit',
    title: 'Edit Dialog',
    description: 'Oeffnet den grossen Shared Edit Dialog mit echten Templates.',
    icon: 'mdi-form-select',
    color: 'primary',
    disabled: !canOpenEditDialog.value,
    open: openEditShowcaseDialog,
  },
  {
    key: 'mail',
    title: 'Mail Dialog',
    description: 'Startet den globalen Mail-Composer mit Playground-Kontext.',
    icon: 'mdi-email-fast-outline',
    color: 'secondary',
    open: openMailShowcaseDialog,
  },
  {
    key: 'phone',
    title: 'Phone Dialog',
    description: 'Startet den globalen Telefon-Dialog mit Demo-Nummer.',
    icon: 'mdi-phone-outline',
    color: 'secondary',
    open: openPhoneShowcaseDialog,
  },
])

const playgroundMetrics = computed(() => [
  { label: 'Actions', value: actionShowcases.length },
  { label: 'Dialogs', value: dialogLaunchers.value.length },
  { label: 'Templates', value: entityTemplates.value.length },
  { label: 'KPI Cards', value: 4 },
])
</script>
