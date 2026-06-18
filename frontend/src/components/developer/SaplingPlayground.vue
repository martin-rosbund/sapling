<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--scroll sapling-page-shell--uniform-inset sapling-showcase sapling-playground"
    fluid
  >
    <v-row>
      <v-col cols="12">
        <v-card
          elevation="1"
          class="glass-panel sapling-showcase__hero-card sapling-playground__hero-card"
        >
          <v-card-text class="sapling-showcase__hero-content sapling-playground__hero-content">
            <div class="sapling-showcase__hero-copy sapling-playground__hero-copy">
              <span class="sapling-showcase__eyebrow sapling-playground__eyebrow">
                {{ t('playground.eyebrow') }}
              </span>
              <h1 class="sapling-showcase__hero-title sapling-playground__hero-title">
                {{ t('playground.title') }}
              </h1>
              <p class="sapling-showcase__hero-description sapling-playground__hero-description">
                {{ t('playground.subtitle') }}
              </p>

              <div class="sapling-showcase__hero-actions sapling-playground__hero-actions">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-form-select"
                  :disabled="!canOpenEditDialog"
                  @click="openEditShowcaseDialog"
                >
                  {{ t('playground.openEditDialog') }}
                </v-btn>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-email-fast-outline"
                  @click="openMailShowcaseDialog"
                >
                  {{ t('playground.startMailDialog') }}
                </v-btn>
              </div>
            </div>

            <div class="sapling-showcase__metric-grid sapling-playground__metric-grid">
              <div
                v-for="metric in playgroundMetrics"
                :key="metric.label"
                class="sapling-showcase__metric sapling-playground__metric glass-panel"
              >
                <span class="sapling-showcase__metric-label sapling-playground__metric-label">
                  {{ metric.label }}
                </span>
                <strong class="sapling-showcase__metric-value sapling-playground__metric-value">
                  {{ metric.value }}
                </strong>
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
          class="mb-6 glass-panel sapling-showcase__section-card sapling-playground__showcase-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-text class="sapling-showcase__section-body sapling-playground__showcase-body">
            <div class="sapling-showcase__section-header sapling-playground__showcase-header">
              <div>
                <span class="sapling-showcase__eyebrow sapling-playground__eyebrow">
                  {{ t('playground.actionsEyebrow') }}
                </span>
                <h2 class="sapling-showcase__section-title sapling-playground__showcase-title">
                  {{ t('playground.actionGalleryTitle') }}
                </h2>
              </div>
              <p
                class="sapling-showcase__section-description sapling-playground__showcase-description"
              >
                {{ t('playground.actionGalleryDescription') }}
              </p>
            </div>

            <v-row>
              <v-col v-for="actionCard in actionShowcases" :key="actionCard.key" cols="12" md="6">
                <div
                  class="sapling-showcase__demo-frame sapling-playground__demo-frame glass-panel"
                >
                  <div class="sapling-showcase__demo-copy sapling-playground__demo-copy">
                    <h3 class="sapling-showcase__demo-title sapling-playground__demo-title">
                      {{ actionCard.title }}
                    </h3>
                    <p
                      class="sapling-showcase__demo-description sapling-playground__demo-description"
                    >
                      {{ actionCard.description }}
                    </p>
                  </div>

                  <div
                    class="sapling-showcase__demo-surface sapling-playground__demo-surface glass-panel"
                  >
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
          class="mb-6 glass-panel sapling-showcase__section-card sapling-playground__showcase-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-text class="sapling-showcase__section-body sapling-playground__showcase-body">
            <div
              class="sapling-showcase__section-header sapling-showcase__section-header--stacked sapling-playground__showcase-header sapling-playground__showcase-header--stacked"
            >
              <div>
                <span class="sapling-showcase__eyebrow sapling-playground__eyebrow">
                  {{ t('playground.dialogsEyebrow') }}
                </span>
                <h2 class="sapling-showcase__section-title sapling-playground__showcase-title">
                  {{ t('playground.launchpadTitle') }}
                </h2>
              </div>
              <p
                class="sapling-showcase__section-description sapling-playground__showcase-description"
              >
                {{ t('playground.launchpadDescription') }}
              </p>
            </div>

            <div class="sapling-showcase__launchpad-grid sapling-playground__launchpad-grid">
              <v-btn
                v-for="launcher in dialogLaunchers"
                :key="launcher.key"
                class="sapling-showcase__launchpad-button sapling-playground__launchpad-button"
                :color="launcher.color"
                :prepend-icon="launcher.icon"
                :variant="launcher.disabled ? 'outlined' : 'flat'"
                :disabled="launcher.disabled"
                @click="launcher.open"
              >
                {{ launcher.title }}
              </v-btn>
            </div>

            <div class="sapling-showcase__launchpad-notes sapling-playground__launchpad-notes">
              <div
                v-for="launcher in dialogLaunchers"
                :key="`${launcher.key}-note`"
                class="sapling-showcase__launchpad-note sapling-playground__launchpad-note glass-panel"
              >
                <strong>{{ launcher.title }}</strong>
                <span>{{ launcher.description }}</span>
              </div>
            </div>

            <v-alert class="mt-4" type="info" variant="tonal">
              {{
                t('playground.contextInfo', {
                  entity: showcaseEntityHandle,
                  count: entityTemplates.length,
                })
              }}
            </v-alert>

            <div class="d-flex flex-wrap ga-3 mt-4">
              <v-btn
                color="error"
                prepend-icon="mdi-alert-circle-outline"
                @click="simulateMessageCenterMessage('error')"
              >
                {{ t('playground.messageError') }}
              </v-btn>
              <v-btn
                color="warning"
                prepend-icon="mdi-alert-outline"
                @click="simulateMessageCenterMessage('warning')"
              >
                {{ t('playground.messageWarning') }}
              </v-btn>
              <v-btn
                color="success"
                prepend-icon="mdi-check-circle-outline"
                @click="simulateMessageCenterMessage('success')"
              >
                {{ t('playground.messageSuccess') }}
              </v-btn>
              <v-btn
                color="info"
                prepend-icon="mdi-information-outline"
                @click="simulateMessageCenterMessage('info')"
              >
                {{ t('playground.messageInfo') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.textFields') }}</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-short-text-field
                  :label="t('playground.shortTextField')"
                  :model-value="shortTextFieldValue"
                  :disabled="false"
                  @update:model-value="setShortTextFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-long-text-field
                  :label="t('playground.longTextField')"
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
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.markdownField') }}</v-card-title>
          <v-card-text>
            <sapling-markdown-field
              :label="t('playground.markdownField')"
              :model-value="markdownFieldValue"
              :rows="8"
              :show-preview="true"
              @update:model-value="setMarkdownFieldValue"
            />
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.contactFields') }}</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="4">
                <sapling-phone-field
                  :label="t('playground.phoneField')"
                  :model-value="phoneFieldValue"
                  :disabled="false"
                  @update:model-value="setPhoneFieldValue"
                  :placeholder="t('playground.phonePlaceholder')"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <sapling-mail-field
                  :label="t('playground.mailField')"
                  :model-value="mailFieldValue"
                  :disabled="false"
                  @update:model-value="setMailFieldValue"
                  :placeholder="t('playground.mailPlaceholder')"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <sapling-link-field
                  :label="t('playground.linkField')"
                  :model-value="linkFieldValue"
                  :disabled="false"
                  @update:model-value="setLinkFieldValue"
                  :placeholder="t('playground.linkPlaceholder')"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.otherFields') }}</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-boolean-field
                  :label="t('playground.booleanField')"
                  :model-value="booleanFieldValue"
                  :disabled="false"
                  @update:model-value="setBooleanFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-color-field
                  :label="t('playground.colorField')"
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
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.numbersAndDates') }}</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-number-field
                  :label="t('playground.numberField')"
                  :model-value="numberFieldValue"
                  :disabled="false"
                  @update:model-value="setNumberFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-date-type-field
                  :label="t('playground.dateField')"
                  :model-value="dateTypeFieldValue"
                  :disabled="false"
                  @update:model-value="setDateTypeFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <SaplingFieldMoney
                  :label="t('playground.moneyField')"
                  :model-value="moneyFieldValue"
                  :disabled="false"
                  @update:model-value="setMoneyFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <SaplingFieldPercent
                  :label="t('playground.percentField')"
                  :model-value="percentFieldValue"
                  :disabled="false"
                  @update:model-value="setPercentFieldValue"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-time-field
                  :label="t('playground.timeField')"
                  :model-value="timeFieldValue"
                  :disabled="false"
                  @update:model-value="setTimeFieldValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-date-time-field
                  :label="t('playground.dateTimeField')"
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
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.iconSelection') }}</v-card-title>
          <v-card-text>
            <sapling-icon-field
              :label="t('playground.iconField')"
              :items="iconFieldItems"
              :model-value="iconFieldValue"
              :disabled="false"
              @update:model-value="setIconFieldValue"
            />
          </v-card-text>
        </v-card>

        <v-card
          elevation="1"
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          v-tilt="TILT_SOFT_OPTIONS"
        >
          <v-card-title class="text-h6">{{ t('playground.selectField') }}</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <sapling-select-field
                  :label="t('playground.multiSelectField')"
                  entity-handle="company"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <sapling-single-select-field
                  :label="t('playground.singleSelectField')"
                  entity-handle="company"
                />
              </v-col>
              <v-col cols="12" sm="12">
                <SaplingSingleSelectAddField
                  :label="t('playground.singleSelectTransferField')"
                  :entityHandle="'company'"
                />
              </v-col>
              <v-col cols="12" sm="12">
                <SaplingSelectAddField
                  :label="t('playground.multiSelectTransferField')"
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
          class="mb-6 glass-panel sapling-showcase__content-card sapling-playground__content-card"
          id="playground-data-surfaces"
        >
          <v-card-title class="text-h6">{{ t('playground.searchAndTable') }}</v-card-title>
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
import { useI18n } from 'vue-i18n'
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
import { type Message, useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { TILT_SOFT_OPTIONS } from '@/constants/tilt.constants'
import type { KPIItem, SaplingGenericItem } from '@/entity/entity'
import type { DialogSaveAction, DialogSaveContext, DialogState } from '@/entity/structure'

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
const { pushMessage } = useSaplingMessageCenter()
const { t } = useI18n()

const demoFeedbackVisible = ref(false)
const demoFeedbackMessage = ref('')
const demoFeedbackColor = ref('primary')

const deleteDialogModel = ref(false)
const deleteDialogItem = ref<SaplingGenericItem | null>({
  handle: 101,
  name: t('playground.deleteDialogRecordName'),
})

const kpiDialogModel = ref(false)
const selectedKpi = ref<KPIItem | null>(null)

const editDialogModel = ref(false)
const editDialogMode = ref<DialogState>('create')
const editDialogItem = ref<SaplingGenericItem | null>(null)

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

function simulateMessageCenterMessage(type: Message['type']) {
  const messageConfig: Record<Message['type'], { message: string; description: string }> = {
    error: {
      message: t('playground.messageCenterErrorTitle'),
      description: t('playground.messageCenterErrorDescription'),
    },
    warning: {
      message: t('playground.messageCenterWarningTitle'),
      description: t('playground.messageCenterWarningDescription'),
    },
    success: {
      message: t('playground.messageCenterSuccessTitle'),
      description: t('playground.messageCenterSuccessDescription'),
    },
    info: {
      message: t('playground.messageCenterInfoTitle'),
      description: t('playground.messageCenterInfoDescription'),
    },
  }

  const { message, description } = messageConfig[type]
  pushMessage(type, message, description, 'playground')
}

function openDeleteShowcaseDialog() {
  deleteDialogModel.value = true
}

function handleDeleteConfirm() {
  deleteDialogModel.value = false
  pushDemoFeedback(t('playground.deleteConfirmedFeedback'), 'warning')
}

function handleDeleteCancel() {
  deleteDialogModel.value = false
  pushDemoFeedback(t('playground.deleteClosedFeedback'), 'info')
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
  pushDemoFeedback(
    t('playground.kpiLinkedFeedback', {
      name: selectedKpi.value?.name ?? t('global.notAvailable'),
    }),
    'success',
  )
}

function openEditShowcaseDialog() {
  if (!canOpenEditDialog.value) {
    return
  }

  editDialogMode.value = 'create'
  editDialogItem.value = null
  editDialogModel.value = true
}

function handleEditSave(
  _value: SaplingGenericItem,
  action: DialogSaveAction,
  context?: DialogSaveContext,
) {
  pushDemoFeedback(t('playground.editExecutedFeedback', { action }), 'success')
  context?.complete()
}

function handleEditCancel() {
  pushDemoFeedback(t('playground.editClosedFeedback'), 'info')
}

function openMailShowcaseDialog() {
  openMailDialog({
    entityHandle: showcaseEntityHandle.value,
    itemHandle: 1,
    initialTo: [mailFieldValue.value || 'demo@sapling.local'],
    initialSubject: t('playground.mailInitialSubject'),
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

const actionShowcases = computed<ShowcaseActionCard[]>(() => [
  {
    key: 'save',
    title: t('playground.actionSaveTitle'),
    description: t('playground.actionSaveDescription'),
    component: markRaw(SaplingActionSave),
    props: {
      cancel: () => pushDemoFeedback(t('playground.actionSaveCancelFeedback'), 'info'),
      save: () => pushDemoFeedback(t('playground.actionSaveFeedback'), 'success'),
      saveAndClose: () => pushDemoFeedback(t('playground.actionSaveAndCloseFeedback'), 'success'),
    },
  },
  {
    key: 'delete',
    title: t('playground.actionDeleteTitle'),
    description: t('playground.actionDeleteDescription'),
    component: markRaw(SaplingActionDelete),
    props: {
      handleCancel: () => pushDemoFeedback(t('playground.actionDeleteCancelFeedback'), 'info'),
      handleConfirm: () => pushDemoFeedback(t('playground.actionDeleteConfirmFeedback'), 'warning'),
    },
  },
  {
    key: 'close',
    title: t('playground.actionCloseTitle'),
    description: t('playground.actionCloseDescription'),
    component: markRaw(SaplingActionClose),
    props: {
      close: () => pushDemoFeedback(t('playground.actionCloseFeedback'), 'info'),
    },
  },
  {
    key: 'login',
    title: t('playground.actionLoginTitle'),
    description: t('playground.actionLoginDescription'),
    component: markRaw(SaplingActionLogin),
    props: {
      handleAzure: () => pushDemoFeedback(t('playground.actionAzureLoginFeedback'), 'primary'),
      handleGoogle: () => pushDemoFeedback(t('playground.actionGoogleLoginFeedback'), 'primary'),
      handleLogin: () => pushDemoFeedback(t('playground.actionLocalLoginFeedback'), 'success'),
      isLoading: false,
    },
  },
  {
    key: 'mail',
    title: t('playground.actionMailTitle'),
    description: t('playground.actionMailDescription'),
    component: markRaw(SaplingActionMail),
    props: {
      close: () => pushDemoFeedback(t('playground.actionMailCloseFeedback'), 'info'),
      refreshPreview: () => pushDemoFeedback(t('playground.actionMailRefreshFeedback'), 'primary'),
      send: () => pushDemoFeedback(t('playground.actionMailSendFeedback'), 'success'),
      isPreviewLoading: false,
      isSending: false,
    },
  },
  {
    key: 'upload',
    title: t('playground.actionUploadTitle'),
    description: t('playground.actionUploadDescription'),
    component: markRaw(SaplingActionUpload),
    props: {
      isLoading: false,
    },
    listeners: {
      close: () => pushDemoFeedback(t('playground.actionUploadCloseFeedback'), 'info'),
      upload: () => pushDemoFeedback(t('playground.actionUploadStartFeedback'), 'success'),
    },
  },
  {
    key: 'account',
    title: t('playground.actionAccountTitle'),
    description: t('playground.actionAccountDescription'),
    component: markRaw(SaplingActionAccount),
    props: {
      handleClose: () => pushDemoFeedback(t('playground.actionAccountCloseFeedback'), 'info'),
      handleChangePassword: () =>
        pushDemoFeedback(t('playground.actionAccountPasswordFeedback'), 'primary'),
      handleLogout: () => pushDemoFeedback(t('playground.actionAccountLogoutFeedback'), 'warning'),
    },
  },
  {
    key: 'change-password',
    title: t('playground.actionChangePasswordTitle'),
    description: t('playground.actionChangePasswordDescription'),
    component: markRaw(SaplingActionChangePassword),
    props: {
      allowCancel: true,
      closeDialog: () => pushDemoFeedback(t('playground.actionPasswordCloseFeedback'), 'info'),
      handlePasswordChange: () =>
        pushDemoFeedback(t('playground.actionPasswordConfirmFeedback'), 'success'),
    },
  },
])

const dialogLaunchers = computed<ShowcaseDialogLauncher[]>(() => [
  {
    key: 'delete',
    title: t('playground.deleteDialogTitle'),
    description: t('playground.deleteDialogDescription'),
    icon: 'mdi-delete-outline',
    color: 'error',
    open: openDeleteShowcaseDialog,
  },
  {
    key: 'kpi',
    title: t('playground.kpiDialogTitle'),
    description: t('playground.kpiDialogDescription'),
    icon: 'mdi-chart-box-outline',
    color: 'primary',
    disabled: !canOpenKpiDialog.value,
    open: openKpiShowcaseDialog,
  },
  {
    key: 'edit',
    title: t('playground.editDialogTitle'),
    description: t('playground.editDialogDescription'),
    icon: 'mdi-form-select',
    color: 'primary',
    disabled: !canOpenEditDialog.value,
    open: openEditShowcaseDialog,
  },
  {
    key: 'mail',
    title: t('playground.mailDialogTitle'),
    description: t('playground.mailDialogDescription'),
    icon: 'mdi-email-fast-outline',
    color: 'secondary',
    open: openMailShowcaseDialog,
  },
  {
    key: 'phone',
    title: t('playground.phoneDialogTitle'),
    description: t('playground.phoneDialogDescription'),
    icon: 'mdi-phone-outline',
    color: 'secondary',
    open: openPhoneShowcaseDialog,
  },
])

const playgroundMetrics = computed(() => [
  { label: t('playground.metricActions'), value: actionShowcases.value.length },
  { label: t('playground.metricDialogs'), value: dialogLaunchers.value.length },
  { label: t('playground.metricTemplates'), value: entityTemplates.value.length },
  { label: t('playground.metricKpiCards'), value: 4 },
])
</script>
