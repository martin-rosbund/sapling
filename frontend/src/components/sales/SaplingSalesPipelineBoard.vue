<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--fill sapling-page-shell--uniform-inset sapling-dashboard-page sapling-dashboard-page--flow-xl sapling-admin-dashboard sapling-sales-pipeline-dashboard fill-height"
    fluid
  >
    <SaplingPageHero
      class="sapling-admin-hero sapling-sales-pipeline-hero"
      variant="workspace"
      :eyebrow="t('navigation.salesPipeline')"
      :title="t('salesPipeline.title')"
    >
      <template #title-prefix>
        <v-icon size="30">mdi-chart-timeline-variant</v-icon>
      </template>

      <p class="sapling-sales-pipeline-hero__subtitle">
        {{ t('salesPipeline.subtitle') }}
      </p>

      <template #side>
        <div class="sapling-stack-md sapling-admin-hero__side sapling-sales-pipeline-hero-side">
          <div class="sapling-stat-grid sapling-admin-stat-grid sapling-sales-pipeline-stat-grid">
            <article
              class="sapling-detail-card sapling-admin-stat-card sapling-sales-pipeline-stat-card"
            >
              <span>{{ t('salesPipeline.stages') }}</span>
              <strong>{{ visibleStages.length }}</strong>
            </article>
            <article
              class="sapling-detail-card sapling-admin-stat-card sapling-sales-pipeline-stat-card"
            >
              <span>{{ t('salesPipeline.openOpportunities') }}</span>
              <strong>{{ filteredOpportunities.length }}</strong>
            </article>
            <article
              class="sapling-detail-card sapling-admin-stat-card sapling-sales-pipeline-stat-card"
            >
              <span>{{ t('salesPipeline.pipelineValue') }}</span>
              <strong>{{ formatMoney(openPipelineValue) }}</strong>
            </article>
            <article
              class="sapling-detail-card sapling-admin-stat-card sapling-sales-pipeline-stat-card"
            >
              <span>{{ t('salesPipeline.weightedValue') }}</span>
              <strong>{{ formatMoney(weightedPipelineValue) }}</strong>
            </article>
          </div>

          <div
            class="sapling-action-cluster sapling-admin-hero__actions sapling-sales-pipeline-hero-actions"
          >
            <v-btn
              prepend-icon="mdi-refresh"
              variant="text"
              :disabled="isLoading"
              @click="loadData"
            >
              {{ t('global.refresh') }}
            </v-btn>
            <v-btn
              v-if="canInsertOpportunity"
              color="primary"
              variant="flat"
              prepend-icon="mdi-plus"
              @click="openCreateDialog"
            >
              {{ t('global.createRecord') }}
            </v-btn>
          </div>
        </div>
      </template>
    </SaplingPageHero>

    <section
      class="sapling-page-workspace sapling-page-workspace--main-context sapling-page-workspace--collapse-xl sapling-sales-pipeline-layout"
    >
      <main class="sapling-page-column sapling-sales-pipeline-main">
        <section
          class="sapling-workspace-panel sapling-page-panel sapling-page-panel-stack sapling-admin-workspace sapling-admin-panel-stack sapling-sales-pipeline-workspace glass-panel"
        >
          <div class="sapling-stack-md sapling-admin-toolbar sapling-sales-pipeline-toolbar">
            <div
              class="sapling-split-toolbar sapling-admin-toolbar-actions sapling-sales-pipeline-toolbar-actions"
            >
              <v-text-field
                v-model="search"
                density="comfortable"
                rounded="lg"
                hide-details
                clearable
                prepend-inner-icon="mdi-magnify"
                :label="t('global.search')"
              />
              <v-btn-toggle
                v-model="stageScope"
                class="sapling-sales-pipeline-scope-toggle"
                color="primary"
                density="comfortable"
                mandatory
              >
                <v-btn value="open" variant="outlined" prepend-icon="mdi-progress-clock">
                  {{ t('salesPipeline.open') }}
                </v-btn>
                <v-btn value="all" variant="outlined" prepend-icon="mdi-format-list-group">
                  {{ t('salesPipeline.all') }}
                </v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <v-progress-linear
            v-if="isLoading && hasLoadedOnce"
            color="primary"
            indeterminate
            class="sapling-admin-progress sapling-sales-pipeline-progress"
          />

          <div v-if="isBootstrapping" class="sapling-sales-pipeline-loading-grid">
            <v-skeleton-loader
              v-for="index in 4"
              :key="index"
              class="sapling-sales-pipeline-loading-column"
              type="heading, list-item-three-line, list-item-three-line, list-item-three-line"
            />
          </div>

          <div v-else class="sapling-sales-pipeline-board-shell">
            <section class="sapling-sales-pipeline-board" aria-live="polite">
              <article
                v-for="stage in visibleStages"
                :key="stage.handle"
                class="sapling-section-panel sapling-sales-pipeline-column glass-panel"
                :class="{ 'sapling-sales-pipeline-column--drop': dropStageHandle === stage.handle }"
                @dragover.prevent="onDragOver($event, stage)"
                @drop.prevent="onDrop(stage)"
              >
                <header class="sapling-sales-pipeline-column__header">
                  <div class="sapling-sales-pipeline-column__title-row">
                    <span class="sapling-sales-pipeline-column__icon" :style="getStageStyle(stage)">
                      <v-icon :icon="stage.icon || 'mdi-ray-start-arrow'" size="18" />
                    </span>
                    <div class="sapling-sales-pipeline-column__copy">
                      <h2>{{ stage.title }}</h2>
                      <p>{{ getStageDescription(stage) }}</p>
                    </div>
                  </div>
                  <div class="sapling-sales-pipeline-column__metrics">
                    <v-chip size="x-small" variant="tonal">
                      {{ getStageOpportunities(stage).length }}
                    </v-chip>
                    <v-chip size="x-small" variant="tonal" color="success">
                      {{ formatMoney(getStageValue(stage)) }}
                    </v-chip>
                  </div>
                </header>

                <div class="sapling-sales-pipeline-column__cards">
                  <div
                    v-if="shouldShowDropPreview(stage)"
                    class="sapling-sales-pipeline-drop-preview"
                    :style="getStageStyle(stage)"
                  >
                    <span class="sapling-sales-pipeline-drop-preview__title">
                      {{ draggedOpportunity?.title }}
                    </span>
                    <span
                      v-if="draggedOpportunity"
                      class="sapling-sales-pipeline-drop-preview__meta"
                    >
                      {{ getOpportunityCompanyLabel(draggedOpportunity) }}
                    </span>
                  </div>

                  <button
                    v-for="opportunity in getStageOpportunities(stage)"
                    :key="opportunity.handle ?? opportunity.title"
                    type="button"
                    class="sapling-sales-pipeline-card"
                    :class="{
                      'sapling-sales-pipeline-card--locked': !canUpdateOpportunity,
                      'sapling-sales-pipeline-card--dragging':
                        draggedOpportunityHandle === opportunity.handle,
                    }"
                    :draggable="canUpdateOpportunity"
                    :style="getStageStyle(stage)"
                    :aria-label="opportunity.title"
                    @click="openEditDialog(opportunity)"
                    @dragstart="onDragStart($event, opportunity)"
                    @dragend="onDragEnd"
                  >
                    <span class="sapling-sales-pipeline-card__header">
                      <span class="sapling-sales-pipeline-card__title">{{
                        opportunity.title
                      }}</span>
                      <v-icon icon="mdi-drag-horizontal-variant" size="18" />
                    </span>
                    <span class="sapling-sales-pipeline-card__company">
                      {{ getOpportunityCompanyLabel(opportunity) }}
                    </span>
                    <span class="sapling-sales-pipeline-card__meta">
                      <span>{{ formatMoney(opportunity.expectedRevenue) }}</span>
                      <span>{{ formatProbability(opportunity.probability) }}</span>
                    </span>
                    <span v-if="opportunity.nextStep" class="sapling-sales-pipeline-card__next">
                      {{ opportunity.nextStep }}
                    </span>
                    <span class="sapling-sales-pipeline-card__footer">
                      <span>{{ getOpportunityOwnerLabel(opportunity) }}</span>
                      <span>{{ formatCloseDate(opportunity.closeDate) }}</span>
                    </span>
                  </button>

                  <div
                    v-if="
                      getStageOpportunities(stage).length === 0 && !shouldShowDropPreview(stage)
                    "
                    class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-sales-pipeline-empty-state"
                  >
                    {{ t('salesPipeline.emptyStage') }}
                  </div>
                </div>
              </article>
            </section>
          </div>
        </section>
      </main>

      <aside class="sapling-page-column sapling-sales-pipeline-context">
        <SaplingWorkFilterPanel
          class="sapling-sales-pipeline-filter"
          @update:selected-peoples="onSelectedPeopleUpdate"
          @update:selected-companies="onSelectedCompaniesUpdate"
        />
      </aside>
    </section>

    <SaplingDialogEdit
      v-model="editDialog.visible"
      :mode="editDialog.mode"
      :item="editDialog.item"
      :templates="opportunityState.entityTemplates"
      :entity="opportunityState.entity"
      @save="saveDialog"
      @cancel="closeDialog"
      @update:item="updateDialogItem"
      @update:mode="editDialog.mode = $event"
      @deleted="handleDialogDelete"
    />
  </v-container>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DialogSaveAction, DialogSaveContext, DialogState } from '@/entity/structure'
import type {
  SalesOpportunityItem,
  SalesOpportunityStageItem,
  SaplingGenericItem,
} from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'
import { useGenericStore } from '@/stores/genericStore'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingWorkFilterPanel from '@/components/filter/SaplingWorkFilterPanel.vue'

type StageScope = 'open' | 'all'

interface EditDialogState {
  visible: boolean
  mode: DialogState
  item: SalesOpportunityItem | null
}

const OPPORTUNITY_ENTITY = 'salesOpportunity'
const STAGE_ENTITY = 'salesOpportunityStage'
const OPPORTUNITY_RELATIONS = [
  'type',
  'forecast',
  'source',
  'assigneeCompany',
  'assigneePerson',
  'creatorCompany',
  'creatorPerson',
]

const { t, d, locale } = useI18n()
const { pushMessage } = useSaplingMessageCenter()
const genericStore = useGenericStore()

const search = ref('')
const stageScope = ref<StageScope>('open')
const stages = ref<SalesOpportunityStageItem[]>([])
const opportunities = ref<SalesOpportunityItem[]>([])
const isLoading = ref(false)
const hasLoadedOnce = ref(false)
const selectedPeople = ref<number[]>([])
const selectedCompanies = ref<number[]>([])
const draggedOpportunityHandle = ref<number | string | null>(null)
const dropStageHandle = ref<string | null>(null)
const dragImageElement = ref<HTMLElement | null>(null)
const editDialog = ref<EditDialogState>({ visible: false, mode: 'create', item: null })

const opportunityState = computed(() => genericStore.getState(OPPORTUNITY_ENTITY))
const canInsertOpportunity = computed(
  () => opportunityState.value.entityPermission?.allowInsert === true,
)
const canUpdateOpportunity = computed(
  () => opportunityState.value.entityPermission?.allowUpdate === true,
)
const isBootstrapping = computed(() => isLoading.value && !hasLoadedOnce.value)

const visibleStages = computed(() => {
  const orderedStages = [...stages.value].sort((left, right) => {
    const leftOrder = typeof left.sortOrder === 'number' ? left.sortOrder : 0
    const rightOrder = typeof right.sortOrder === 'number' ? right.sortOrder : 0
    return leftOrder - rightOrder || left.title.localeCompare(right.title)
  })

  if (stageScope.value === 'all') {
    return orderedStages
  }

  return orderedStages.filter((stage) => stage.isClosed !== true)
})

const filteredOpportunities = computed(() => {
  const normalizedSearch = search.value.trim().toLocaleLowerCase()
  const allowedStageHandles = new Set(visibleStages.value.map((stage) => stage.handle))

  return opportunities.value.filter((opportunity) => {
    const stageHandle = getStageHandle(opportunity)
    if (!stageHandle || !allowedStageHandles.has(stageHandle)) {
      return false
    }

    if (opportunity.isActive === false && stageScope.value === 'open') {
      return false
    }

    if (!matchesWorkFilter(opportunity)) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return [
      opportunity.title,
      opportunity.nextStep,
      opportunity.assigneeCompany?.name,
      opportunity.creatorCompany?.name,
      getOpportunityOwnerLabel(opportunity),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })
})

const openPipelineValue = computed(() =>
  filteredOpportunities.value
    .filter((opportunity) => opportunity.type?.isClosed !== true)
    .reduce((sum, opportunity) => sum + normalizeMoney(opportunity.expectedRevenue), 0),
)

const weightedPipelineValue = computed(() =>
  filteredOpportunities.value
    .filter((opportunity) => opportunity.type?.isClosed !== true)
    .reduce(
      (sum, opportunity) =>
        sum +
        normalizeMoney(opportunity.expectedRevenue) *
          (normalizeProbability(opportunity.probability) / 100),
      0,
    ),
)
const draggedOpportunity = computed(() =>
  opportunities.value.find((entry) => entry.handle === draggedOpportunityHandle.value),
)

onMounted(async () => {
  await genericStore.loadGenericMany([
    { entityHandle: OPPORTUNITY_ENTITY, namespaces: ['global', 'navigation', 'salesPipeline'] },
    { entityHandle: STAGE_ENTITY, namespaces: ['global', 'navigation', 'salesPipeline'] },
  ])
  await loadData()
})

async function loadData(): Promise<void> {
  isLoading.value = true

  try {
    const [stageResponse, opportunityResponse] = await Promise.all([
      ApiGenericService.find<SalesOpportunityStageItem>(STAGE_ENTITY, {
        orderBy: { sortOrder: 'ASC', title: 'ASC' },
        limit: DEFAULT_ENTITY_ITEMS_COUNT,
      }),
      ApiGenericService.find<SalesOpportunityItem>(OPPORTUNITY_ENTITY, {
        orderBy: { closeDate: 'ASC', updatedAt: 'DESC' },
        limit: DEFAULT_ENTITY_ITEMS_COUNT,
        relations: OPPORTUNITY_RELATIONS,
      }),
    ])

    stages.value = stageResponse.data
    opportunities.value = opportunityResponse.data
    hasLoadedOnce.value = true
  } finally {
    isLoading.value = false
  }
}

function getStageHandle(opportunity: SalesOpportunityItem): string {
  const stage = opportunity.type
  if (typeof stage === 'string') {
    return stage
  }

  return stage?.handle ?? ''
}

function getStageOpportunities(stage: SalesOpportunityStageItem): SalesOpportunityItem[] {
  return filteredOpportunities.value.filter(
    (opportunity) => getStageHandle(opportunity) === stage.handle,
  )
}

function getStageValue(stage: SalesOpportunityStageItem): number {
  return getStageOpportunities(stage).reduce(
    (sum, opportunity) => sum + normalizeMoney(opportunity.expectedRevenue),
    0,
  )
}

function matchesWorkFilter(opportunity: SalesOpportunityItem): boolean {
  const hasPeopleFilter = selectedPeople.value.length > 0
  const hasCompanyFilter = selectedCompanies.value.length > 0
  if (!hasPeopleFilter && !hasCompanyFilter) {
    return true
  }

  const personMatches =
    hasPeopleFilter &&
    [opportunity.assigneePerson, opportunity.creatorPerson].some((relation) =>
      selectedPeople.value.includes(getRelationHandleNumber(relation)),
    )
  const companyMatches =
    hasCompanyFilter &&
    [opportunity.assigneeCompany, opportunity.creatorCompany].some((relation) =>
      selectedCompanies.value.includes(getRelationHandleNumber(relation)),
    )

  return personMatches || companyMatches
}

function shouldShowDropPreview(stage: SalesOpportunityStageItem): boolean {
  if (draggedOpportunity.value == null || dropStageHandle.value !== stage.handle) {
    return false
  }

  return getStageHandle(draggedOpportunity.value) !== stage.handle
}

function getStageStyle(stage: SalesOpportunityStageItem): Record<string, string> {
  const color = stage.color || '#607d8b'
  return {
    '--sapling-sales-stage-color': color,
  }
}

function getStageDescription(stage: SalesOpportunityStageItem): string {
  if (stage.isSuccess) {
    return t('salesPipeline.wonStage')
  }

  if (stage.isClosed) {
    return t('salesPipeline.closedStage')
  }

  return formatProbability(stage.defaultProbability)
}

function normalizeMoney(value: unknown): number {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizeProbability(value: unknown): number {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? Math.min(100, Math.max(0, numberValue)) : 0
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(normalizeMoney(value))
}

function formatProbability(value: unknown): string {
  return `${Math.round(normalizeProbability(value))}%`
}

function formatCloseDate(value: unknown): string {
  if (!value) {
    return t('salesPipeline.noCloseDate')
  }

  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? t('salesPipeline.noCloseDate') : d(date)
}

function getOpportunityCompanyLabel(opportunity: SalesOpportunityItem): string {
  return (
    opportunity.assigneeCompany?.name ||
    opportunity.creatorCompany?.name ||
    t('salesPipeline.noCompany')
  )
}

function getOpportunityOwnerLabel(opportunity: SalesOpportunityItem): string {
  const person = opportunity.assigneePerson ?? opportunity.creatorPerson
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()
  return name || t('salesPipeline.noOwner')
}

function getRelationHandleNumber(relation: unknown): number {
  if (typeof relation === 'number') {
    return relation
  }

  if (typeof relation === 'string') {
    const parsed = Number.parseInt(relation, 10)
    return Number.isNaN(parsed) ? Number.NaN : parsed
  }

  if (typeof relation === 'object' && relation !== null && 'handle' in relation) {
    return getRelationHandleNumber((relation as { handle?: unknown }).handle)
  }

  return Number.NaN
}

function normalizeFilterHandles(values: string[]): number[] {
  return values.map((value) => Number.parseInt(value, 10)).filter((value) => !Number.isNaN(value))
}

function onSelectedPeopleUpdate(values: string[]): void {
  selectedPeople.value = normalizeFilterHandles(values)
}

function onSelectedCompaniesUpdate(values: string[]): void {
  selectedCompanies.value = normalizeFilterHandles(values)
}

function onDragStart(event: DragEvent, opportunity: SalesOpportunityItem): void {
  if (!canUpdateOpportunity.value || opportunity.handle == null) {
    event.preventDefault()
    return
  }

  draggedOpportunityHandle.value = opportunity.handle
  event.dataTransfer?.setData('text/plain', String(opportunity.handle))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    setCardDragImage(event)
  }
}

function onDragOver(event: DragEvent, stage: SalesOpportunityStageItem): void {
  if (draggedOpportunityHandle.value != null && dropStageHandle.value !== stage.handle) {
    dropStageHandle.value = stage.handle
  }

  if (event.dataTransfer != null) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDragEnd(): void {
  draggedOpportunityHandle.value = null
  dropStageHandle.value = null
  clearCardDragImage()
}

function setCardDragImage(event: DragEvent): void {
  const source = event.currentTarget
  if (!(source instanceof HTMLElement) || event.dataTransfer == null) {
    return
  }

  clearCardDragImage()
  const dragImage = source.cloneNode(true) as HTMLElement
  dragImage.classList.add('sapling-sales-pipeline-card--drag-image')
  dragImage.style.width = `${source.offsetWidth}px`
  document.body.appendChild(dragImage)
  dragImageElement.value = dragImage
  event.dataTransfer.setDragImage(dragImage, Math.min(source.offsetWidth / 2, 180), 28)
}

function clearCardDragImage(): void {
  dragImageElement.value?.remove()
  dragImageElement.value = null
}

async function onDrop(stage: SalesOpportunityStageItem): Promise<void> {
  const handle = draggedOpportunityHandle.value
  onDragEnd()

  if (handle == null || !canUpdateOpportunity.value) {
    return
  }

  const opportunity = opportunities.value.find((entry) => entry.handle === handle)
  if (!opportunity || getStageHandle(opportunity) === stage.handle) {
    return
  }

  await moveOpportunity(opportunity, stage)
}

async function moveOpportunity(
  opportunity: SalesOpportunityItem,
  stage: SalesOpportunityStageItem,
): Promise<void> {
  if (opportunity.handle == null) {
    return
  }

  const previousStage = opportunity.type
  opportunity.type = stage

  try {
    const updatedOpportunity = await ApiGenericService.update<SaplingGenericItem>(
      OPPORTUNITY_ENTITY,
      opportunity.handle,
      { type: stage.handle },
      { relations: OPPORTUNITY_RELATIONS },
    )
    patchOpportunity(updatedOpportunity as SalesOpportunityItem)
    pushMessage(
      'success',
      t('salesPipeline.stageUpdated'),
      t('salesPipeline.stageUpdatedDescription', { stage: stage.title }),
      OPPORTUNITY_ENTITY,
    )
  } catch {
    opportunity.type = previousStage
  }
}

function patchOpportunity(item: SalesOpportunityItem | null | undefined): void {
  if (item?.handle == null) {
    return
  }

  const index = opportunities.value.findIndex((entry) => entry.handle === item.handle)
  if (index === -1) {
    opportunities.value = [item, ...opportunities.value]
    return
  }

  opportunities.value.splice(index, 1, {
    ...opportunities.value[index],
    ...item,
  })
}

async function loadDialogItem(item: SalesOpportunityItem): Promise<SalesOpportunityItem> {
  if (item.handle == null) {
    return item
  }

  const result = await ApiGenericService.find<SalesOpportunityItem>(OPPORTUNITY_ENTITY, {
    filter: { handle: item.handle },
    limit: 1,
    relations: OPPORTUNITY_RELATIONS,
  })

  return result.data[0] ?? item
}

function openCreateDialog(): void {
  const firstStage = visibleStages.value[0] ?? stages.value[0]
  editDialog.value = {
    visible: true,
    mode: 'create',
    item: firstStage ? ({ type: firstStage } as SalesOpportunityItem) : null,
  }
}

async function openEditDialog(opportunity: SalesOpportunityItem): Promise<void> {
  editDialog.value = {
    visible: true,
    mode: 'edit',
    item: await loadDialogItem(opportunity),
  }
}

function closeDialog(): void {
  editDialog.value = {
    ...editDialog.value,
    visible: false,
  }
}

function updateDialogItem(item: SaplingGenericItem | null): void {
  editDialog.value.item = item as SalesOpportunityItem | null
}

async function saveDialog(
  item: SaplingGenericItem,
  action: DialogSaveAction,
  context?: DialogSaveContext,
): Promise<void> {
  let didSave = false

  try {
    if (editDialog.value.mode === 'edit' && editDialog.value.item?.handle != null) {
      const updated = await ApiGenericService.update<SalesOpportunityItem>(
        OPPORTUNITY_ENTITY,
        editDialog.value.item.handle,
        item,
        { relations: OPPORTUNITY_RELATIONS },
      )
      patchOpportunity(await loadDialogItem(updated))
    } else if (editDialog.value.mode === 'create') {
      const created = await ApiGenericService.create<SalesOpportunityItem>(OPPORTUNITY_ENTITY, item)
      patchOpportunity(await loadDialogItem(created))
    }

    didSave = true
    pushMessage(
      'success',
      t('global.recordSaved'),
      t('global.recordSavedDescription'),
      OPPORTUNITY_ENTITY,
    )

    if (action === 'saveAndClose') {
      closeDialog()
      return
    }

    if (editDialog.value.item) {
      editDialog.value = {
        visible: true,
        mode: 'edit',
        item: await loadDialogItem(editDialog.value.item),
      }
    }
  } finally {
    context?.complete(didSave)
  }
}

function handleDialogDelete(item: SaplingGenericItem | null): void {
  const handle = item?.handle
  if (handle != null) {
    opportunities.value = opportunities.value.filter((entry) => entry.handle !== handle)
  }
  closeDialog()
}
</script>
