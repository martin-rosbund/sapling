<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--uniform-inset sapling-config-page sapling-ai-agent-builder"
    fluid
  >
    <SaplingPageHero
      class="sapling-config-hero sapling-ai-agent-builder__hero"
      variant="system"
      :eyebrow="t('aiAgentBuilder.eyebrow')"
      :title="t('aiAgentBuilder.title')"
      :subtitle="t('aiAgentBuilder.subtitle')"
    >
      <template #meta>
        <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-creation">
          {{ agents.length }} {{ t('aiAgentBuilder.agentCount') }}
        </v-chip>
        <v-chip size="small" variant="outlined" prepend-icon="mdi-check-circle-outline">
          {{ activeAgentCount }} {{ t('aiAgentBuilder.activeAgents') }}
        </v-chip>
      </template>

      <template #side>
        <div class="sapling-action-cluster sapling-ai-agent-builder__hero-actions">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="startNewAgent">
            {{ t('aiAgentBuilder.newAgent') }}
          </v-btn>
        </div>
      </template>
    </SaplingPageHero>

    <section class="sapling-config-workspace sapling-ai-agent-builder__workspace">
      <SaplingSurface
        class="sapling-panel-shell sapling-section-panel sapling-config-panel sapling-config-panel--blurred sapling-ai-agent-builder__rail"
      >
        <div class="sapling-ai-agent-builder__rail-header">
          <span>{{ t('aiAgentBuilder.agentList') }}</span>
          <v-btn
            icon="mdi-plus"
            variant="tonal"
            size="small"
            :title="t('aiAgentBuilder.newAgent')"
            @click="startNewAgent"
          />
        </div>

        <v-list class="sapling-ai-agent-builder__list" density="comfortable" nav>
          <v-list-item
            v-for="agent in agents"
            :key="agent.handle"
            :active="agent.handle === selectedAgent?.handle"
            :prepend-icon="agent.icon || 'mdi-creation'"
            :title="agent.title"
            :subtitle="getAgentSubtitle(agent)"
            rounded="lg"
            @click="selectAgent(agent)"
          />
        </v-list>
      </SaplingSurface>

      <SaplingSurface
        class="sapling-panel-shell sapling-section-panel sapling-config-panel sapling-config-panel--blurred sapling-ai-agent-builder__editor"
      >
        <v-tabs
          v-model="activeTab"
          class="sapling-ai-agent-builder__tabs"
          density="comfortable"
          show-arrows
        >
          <v-tab value="profile">{{ t('aiAgentBuilder.tabProfile') }}</v-tab>
          <v-tab value="prompt">{{ t('aiAgentBuilder.tabPrompt') }}</v-tab>
          <v-tab value="data">{{ t('aiAgentBuilder.tabData') }}</v-tab>
          <v-tab value="tools">{{ t('aiAgentBuilder.tabTools') }}</v-tab>
          <v-tab value="runtime">{{ t('aiAgentBuilder.tabRuntime') }}</v-tab>
          <v-tab value="release">{{ t('aiAgentBuilder.tabRelease') }}</v-tab>
          <v-tab value="versions">{{ t('aiAgentBuilder.tabVersions') }}</v-tab>
          <v-tab value="test">{{ t('aiAgentBuilder.tabTestRuns') }}</v-tab>
          <v-tab value="memory">{{ t('aiAgentBuilder.tabMemory') }}</v-tab>
          <v-tab value="quality">{{ t('aiAgentBuilder.tabQuality') }}</v-tab>
          <v-tab value="usage">{{ t('aiAgentBuilder.tabUsage') }}</v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="sapling-ai-agent-builder__window">
          <v-window-item value="profile">
            <div class="sapling-ai-agent-builder__grid">
              <v-text-field
                v-model="draft.handle"
                :disabled="isEditingExisting"
                :label="t('aiAgentBuilder.fieldHandle')"
                required
              />
              <v-text-field
                v-model="draft.title"
                :label="t('aiAgentBuilder.fieldTitle')"
                required
              />
              <v-text-field v-model="draft.icon" :label="t('aiAgentBuilder.fieldIcon')" />
              <v-text-field v-model="draft.color" :label="t('aiAgentBuilder.fieldColor')" />
              <v-textarea
                v-model="draft.description"
                class="sapling-ai-agent-builder__wide"
                :label="t('aiAgentBuilder.fieldDescription')"
                rows="3"
              />
              <v-combobox
                v-model="draft.conversationStarters"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :label="t('aiAgentBuilder.fieldStarters')"
              />
            </div>
          </v-window-item>

          <v-window-item value="prompt">
            <div class="sapling-ai-agent-builder__grid">
              <v-textarea
                v-model="draft.promptMarkdown"
                class="sapling-ai-agent-builder__wide"
                :label="t('aiAgentBuilder.fieldPrompt')"
                rows="12"
                required
              />
              <v-textarea
                v-model="draft.welcomeMessage"
                class="sapling-ai-agent-builder__wide"
                :label="t('aiAgentBuilder.fieldWelcome')"
                rows="4"
              />
            </div>
          </v-window-item>

          <v-window-item value="data">
            <div class="sapling-ai-agent-builder__grid">
              <SaplingFieldSelect
                v-model="selectedAllowedEntities"
                class="sapling-ai-agent-builder__wide"
                entity-handle="entity"
                :label="t('aiAgentBuilder.fieldEntities')"
                density="comfortable"
                hide-details
              />
              <SaplingFieldSelect
                v-model="selectedAllowedKnowledgeEntities"
                class="sapling-ai-agent-builder__wide"
                entity-handle="entity"
                :parent-filter="knowledgeEntityFilter"
                :label="t('aiAgentBuilder.fieldKnowledge')"
                density="comfortable"
                hide-details
              />
            </div>
          </v-window-item>

          <v-window-item value="tools">
            <div class="sapling-ai-agent-builder__grid">
              <v-select
                v-model="draft.allowedInternalTools"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :items="internalToolOptions"
                :label="t('aiAgentBuilder.fieldInternalTools')"
              />
              <v-select
                v-model="draft.allowedExternalTools"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :items="externalToolOptions"
                :label="t('aiAgentBuilder.fieldExternalTools')"
              />
            </div>
          </v-window-item>

          <v-window-item value="runtime">
            <div class="sapling-ai-agent-builder__grid">
              <v-select
                v-model="draft.provider"
                item-title="title"
                item-value="handle"
                :items="providers"
                :label="t('aiAgentBuilder.fieldProvider')"
                clearable
              />
              <v-select
                v-model="draft.model"
                item-title="title"
                item-value="handle"
                :items="filteredModels"
                :label="t('aiAgentBuilder.fieldModel')"
                clearable
              />
              <v-select
                v-model="draft.mutationMode"
                :items="mutationModeOptions"
                :label="t('aiAgentBuilder.fieldMutationMode')"
              />
            </div>
          </v-window-item>

          <v-window-item value="release">
            <div class="sapling-ai-agent-builder__grid">
              <SaplingFieldSelect
                v-model="selectedRoles"
                class="sapling-ai-agent-builder__wide"
                entity-handle="role"
                :label="t('aiAgentBuilder.fieldRoles')"
                density="comfortable"
                hide-details
              />
              <v-switch v-model="draft.isActive" :label="t('aiAgentBuilder.fieldActive')" />
              <v-switch v-model="draft.isDefault" :label="t('aiAgentBuilder.fieldDefault')" />
              <v-text-field
                v-model.number="draft.sortOrder"
                type="number"
                :label="t('aiAgentBuilder.fieldSortOrder')"
              />
            </div>
          </v-window-item>

          <v-window-item value="versions">
            <div class="sapling-ai-agent-builder__panel-stack">
              <div class="sapling-row-between-xs">
                <div>
                  <strong>{{ t('aiAgentBuilder.versionsTitle') }}</strong>
                  <p>
                    {{ t('aiAgentBuilder.versionsSubtitle') }}
                  </p>
                </div>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-source-branch-plus"
                  :disabled="!selectedAgent"
                  @click="createVersionFromDraft"
                >
                  {{ t('aiAgentBuilder.createVersion') }}
                </v-btn>
              </div>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>{{ t('global.version') }}</th>
                    <th>{{ t('global.status') }}</th>
                    <th>{{ t('aiAgentBuilder.fieldProvider') }}</th>
                    <th>{{ t('aiAgentBuilder.fieldModel') }}</th>
                    <th>{{ t('aiAgentBuilder.updatedAt') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="version in workbenchVersions" :key="version.handle ?? version.version">
                    <td>v{{ version.version }}</td>
                    <td>
                      <v-chip size="small" variant="tonal">{{ version.status }}</v-chip>
                    </td>
                    <td>{{ getProviderHandle(version.provider) || t('global.notAvailable') }}</td>
                    <td>{{ getModelHandle(version.model) || t('global.notAvailable') }}</td>
                    <td>{{ formatDate(version.updatedAt) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>

          <v-window-item value="test">
            <div class="sapling-ai-agent-builder__panel-stack">
              <v-textarea v-model="testPrompt" :label="t('aiAgentBuilder.testPrompt')" rows="5" />
              <div class="sapling-row-md">
                <v-select
                  v-model="selectedTestVersionHandle"
                  :items="versionOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  :label="t('aiAgentBuilder.testVersion')"
                />
                <v-select
                  v-model="selectedTestPlaybookHandle"
                  :items="playbookOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  :label="t('aiAgentBuilder.testPlaybook')"
                />
                <v-btn
                  color="primary"
                  prepend-icon="mdi-play-circle-outline"
                  :disabled="!selectedAgent || !testPrompt.trim()"
                  :loading="isRunningTest"
                  @click="runAgentTest"
                >
                  {{ t('aiAgentBuilder.runTest') }}
                </v-btn>
              </div>
              <v-alert v-if="latestTestRun" type="info" variant="tonal">
                {{ latestTestRun.status }} - {{ latestTestRun.durationMs ?? '-' }} ms
              </v-alert>
            </div>
          </v-window-item>

          <v-window-item value="memory">
            <div class="sapling-ai-agent-builder__panel-stack">
              <strong>{{ t('aiAgentBuilder.memoryTitle') }}</strong>
              <article
                v-for="playbook in workbenchPlaybooks"
                :key="playbook.handle"
                class="sapling-section-panel sapling-ai-agent-builder__mini-card"
              >
                <div class="sapling-row-between-xs">
                  <strong>{{ playbook.title }}</strong>
                  <v-chip
                    size="small"
                    variant="tonal"
                    :color="playbook.isActive ? 'success' : undefined"
                  >
                    {{ playbook.isActive ? t('global.active') : t('global.inactive') }}
                  </v-chip>
                </div>
                <p v-if="playbook.description">{{ playbook.description }}</p>
                <div v-if="playbook.triggerEntityHandles?.length" class="sapling-row-xs">
                  <v-chip
                    v-for="entityHandle in playbook.triggerEntityHandles"
                    :key="entityHandle"
                    size="small"
                    variant="outlined"
                  >
                    {{ entityHandle }}
                  </v-chip>
                </div>
                <ol v-if="playbook.steps?.length" class="sapling-stack-xs">
                  <li
                    v-for="(step, stepIndex) in playbook.steps"
                    :key="`${playbook.handle}-${stepIndex}`"
                  >
                    {{ step }}
                  </li>
                </ol>
                <p v-if="playbook.expectedOutput">{{ playbook.expectedOutput }}</p>
              </article>
              <v-alert v-if="workbenchPlaybooks.length === 0" type="info" variant="tonal">
                {{ t('aiAgentBuilder.noPlaybooks') }}
              </v-alert>
              <article
                v-for="memory in workbenchMemories"
                :key="memory.handle ?? memory.title"
                class="sapling-section-panel sapling-ai-agent-builder__mini-card"
              >
                <div class="sapling-row-between-xs">
                  <strong>{{ memory.title }}</strong>
                  <v-chip size="small" variant="tonal">{{ memory.type }}</v-chip>
                </div>
                <p>{{ memory.contentMarkdown }}</p>
              </article>
              <v-alert v-if="workbenchMemories.length === 0" type="info" variant="tonal">
                {{ t('aiAgentBuilder.noMemory') }}
              </v-alert>
            </div>
          </v-window-item>

          <v-window-item value="quality">
            <div class="sapling-ai-agent-builder__panel-stack">
              <div class="sapling-ai-agent-builder__grid">
                <v-text-field
                  v-model="evaluationDraft.title"
                  :label="t('aiAgentBuilder.evaluationTitle')"
                />
                <v-select
                  v-model="evaluationDraft.agentVersionHandle"
                  :items="versionOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  :label="t('aiAgentBuilder.testVersion')"
                />
                <v-textarea
                  v-model="evaluationDraft.prompt"
                  class="sapling-ai-agent-builder__wide"
                  :label="t('aiAgentBuilder.testPrompt')"
                  rows="4"
                />
                <v-textarea
                  v-model="evaluationDraft.expectedCriteria"
                  class="sapling-ai-agent-builder__wide"
                  :label="t('aiAgentBuilder.expectedCriteria')"
                  rows="3"
                />
              </div>
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-clipboard-check-outline"
                :disabled="
                  !selectedAgent || !evaluationDraft.title.trim() || !evaluationDraft.prompt.trim()
                "
                @click="createEvaluation"
              >
                {{ t('aiAgentBuilder.createEvaluation') }}
              </v-btn>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>{{ t('aiAgentBuilder.evaluationTitle') }}</th>
                    <th>{{ t('global.status') }}</th>
                    <th>{{ t('aiAgentBuilder.updatedAt') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="evaluation in workbenchEvaluations"
                    :key="evaluation.handle ?? evaluation.title"
                  >
                    <td>{{ evaluation.title }}</td>
                    <td>
                      <v-chip size="small" variant="tonal">{{ evaluation.status }}</v-chip>
                    </td>
                    <td>{{ formatDate(evaluation.updatedAt) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>

          <v-window-item value="usage">
            <div class="sapling-ai-agent-builder__panel-stack">
              <div class="sapling-ai-agent-builder__stats">
                <v-chip color="primary" variant="tonal"
                  >{{ workbenchStats.runsTotal ?? 0 }} {{ t('aiAgentBuilder.runs') }}</v-chip
                >
                <v-chip variant="tonal"
                  >{{ workbenchStats.failedRuns ?? 0 }} {{ t('aiAgentBuilder.failedRuns') }}</v-chip
                >
                <v-chip variant="tonal"
                  >{{ workbenchStats.pendingActions ?? 0 }}
                  {{ t('aiAgentBuilder.actions') }}</v-chip
                >
                <v-chip variant="tonal">
                  {{ workbenchStats.evaluationPassRate ?? t('global.notAvailable') }}%
                  {{ t('aiAgentBuilder.tabQuality') }}
                </v-chip>
              </div>
              <AiAgentRunTraceList :runs="workbenchRuns" />
            </div>
          </v-window-item>
        </v-window>

        <div class="sapling-ai-agent-builder__actions">
          <v-btn variant="text" @click="resetDraft">{{ t('global.cancel') }}</v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-content-save"
            :disabled="!canSaveAgent"
            :loading="isSaving"
            @click="saveAgent"
          >
            {{ t('global.save') }}
          </v-btn>
        </div>
      </SaplingSurface>
    </section>
  </v-container>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingFieldSelect from '@/components/dialog/fields/SaplingFieldSelect.vue'
import AiAgentRunTraceList from '@/components/ai/AiAgentRunTraceList.vue'
import type {
  AiAgentItem,
  AiAgentEvaluationItem,
  AiAgentMemoryItem,
  AiAgentPlaybookItem,
  AiAgentRunItem,
  AiAgentVersionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
  EntityItem,
  RoleItem,
  SaplingGenericItem,
} from '@/entity/entity'
import ApiAiService, { type AiMcpToolDescriptor } from '@/services/api.ai.service'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'
import TranslationService from '@/services/translation.service'

type AgentDraft = {
  handle: string
  title: string
  description: string | null
  icon: string | null
  color: string | null
  promptMarkdown: string
  welcomeMessage: string | null
  conversationStarters: string[]
  provider: string | null
  model: string | null
  allowedEntityHandles: string[]
  allowedKnowledgeEntityHandles: string[]
  allowedInternalTools: string[]
  allowedExternalTools: string[]
  mutationMode: string
  roles: number[]
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

const KNOWLEDGE_ENTITY_HANDLES = [
  'knowledgeArticle',
  'ticket',
  'effortEstimate',
  'effortEstimatePosition',
  'salesOpportunity',
] as const

const { t } = useI18n()
const activeTab = ref('profile')
const agents = ref<AiAgentItem[]>([])
const selectedAgent = ref<AiAgentItem | null>(null)
const providers = ref<AiProviderTypeItem[]>([])
const models = ref<AiProviderModelItem[]>([])
const entities = ref<EntityItem[]>([])
const roles = ref<RoleItem[]>([])
const tools = ref<AiMcpToolDescriptor[]>([])
const workbenchVersions = ref<AiAgentVersionItem[]>([])
const workbenchPlaybooks = ref<AiAgentPlaybookItem[]>([])
const workbenchMemories = ref<AiAgentMemoryItem[]>([])
const workbenchRuns = ref<AiAgentRunItem[]>([])
const workbenchEvaluations = ref<AiAgentEvaluationItem[]>([])
const workbenchStats = ref<Record<string, number | null | undefined>>({})
const isSaving = ref(false)
const isRunningTest = ref(false)
const translationService = new TranslationService()
const draft = ref(createEmptyDraft())
const testPrompt = ref('')
const selectedTestVersionHandle = ref<number | null>(null)
const selectedTestPlaybookHandle = ref<string | null>(null)
const latestTestRun = ref<AiAgentRunItem | null>(null)
const evaluationDraft = ref({
  title: '',
  prompt: '',
  expectedCriteria: '',
  agentVersionHandle: null as number | null,
})

const isEditingExisting = computed(() => !!selectedAgent.value?.handle)
const activeAgentCount = computed(() => agents.value.filter((agent) => agent.isActive).length)
const canSaveAgent = computed(
  () =>
    !!draft.value.handle.trim() &&
    !!draft.value.title.trim() &&
    !!draft.value.promptMarkdown.trim(),
)
const knowledgeEntityFilter = computed<FilterQuery>(() => ({
  handle: { $in: [...KNOWLEDGE_ENTITY_HANDLES] },
}))
const selectedAllowedEntities = computed<SaplingGenericItem[]>({
  get: () => mapHandlesToItems(draft.value.allowedEntityHandles, entities.value),
  set: (value) => {
    draft.value.allowedEntityHandles = getStringHandles(value)
  },
})
const selectedAllowedKnowledgeEntities = computed<SaplingGenericItem[]>({
  get: () => mapHandlesToItems(draft.value.allowedKnowledgeEntityHandles, entities.value),
  set: (value) => {
    draft.value.allowedKnowledgeEntityHandles = getStringHandles(value)
  },
})
const selectedRoles = computed<SaplingGenericItem[]>({
  get: () => mapHandlesToItems(draft.value.roles, roles.value),
  set: (value) => {
    draft.value.roles = getNumberHandles(value)
  },
})
const internalToolOptions = computed(() =>
  tools.value.filter((tool) => tool.serverName === 'sapling').map((tool) => tool.toolName),
)
const externalToolOptions = computed(() =>
  tools.value
    .filter((tool) => tool.serverName !== 'sapling')
    .map((tool) => `${tool.serverName}.${tool.toolName}`),
)
const filteredModels = computed(() => {
  if (!draft.value.provider) {
    return models.value
  }

  return models.value.filter((model) => getProviderHandle(model.provider) === draft.value.provider)
})
const versionOptions = computed(() =>
  workbenchVersions.value.map((version) => ({
    title: `v${version.version} (${version.status})`,
    value: version.handle ?? null,
  })),
)
const playbookOptions = computed(() =>
  workbenchPlaybooks.value.map((playbook) => ({
    title: playbook.title,
    value: playbook.handle,
  })),
)
const mutationModeOptions = computed(() => [
  {
    title: t('aiAgentBuilder.mutationConfirm'),
    value: 'confirm',
  },
  { title: t('aiAgentBuilder.mutationReadOnly'), value: 'readOnly' },
])

onMounted(async () => {
  await Promise.all([
    translationService.prepare(
      'aiAgentBuilder',
      'aiAgent',
      'aiChatToolAction',
      'navigation',
      'global',
    ),
    loadAgents(),
    loadReferenceData(),
  ])
  selectAgent(agents.value.find((agent) => agent.isDefault) ?? agents.value[0] ?? null)
})

async function loadAgents() {
  agents.value = await ApiAiService.listAgents()
}

async function loadReferenceData() {
  const [providerList, modelList, entityPage, rolePage, toolList] = await Promise.all([
    ApiAiService.listProviders(),
    ApiAiService.listModels(),
    ApiGenericService.find<EntityItem>('entity', { limit: 200 }),
    ApiGenericService.find<RoleItem>('role', { limit: 100 }),
    ApiAiService.listMcpTools(),
  ])

  providers.value = providerList
  models.value = modelList
  entities.value = entityPage.data
  roles.value = rolePage.data
  tools.value = toolList
}

function selectAgent(agent: AiAgentItem | null) {
  selectedAgent.value = agent
  draft.value = agent ? toDraft(agent) : createEmptyDraft()
  latestTestRun.value = null
  if (agent) {
    void loadWorkbench(agent.handle)
  } else {
    resetWorkbench()
  }
}

function startNewAgent() {
  selectedAgent.value = null
  draft.value = createEmptyDraft()
  activeTab.value = 'profile'
}

function getAgentSubtitle(agent: AiAgentItem): string {
  if (agent.isDefault) {
    return t('aiAgentBuilder.defaultAgent')
  }

  return agent.mutationMode === 'readOnly'
    ? t('aiAgentBuilder.mutationReadOnly')
    : t('aiAgentBuilder.mutationConfirm')
}

function resetDraft() {
  selectAgent(selectedAgent.value)
}

async function saveAgent() {
  if (!canSaveAgent.value) {
    return
  }

  isSaving.value = true

  try {
    const payload = toPayload(draft.value)
    const savedAgent = isEditingExisting.value
      ? await ApiGenericService.update<AiAgentItem>('aiAgent', draft.value.handle, payload)
      : await ApiGenericService.create<AiAgentItem>('aiAgent', payload)

    await loadAgents()
    selectAgent(agents.value.find((agent) => agent.handle === savedAgent.handle) ?? savedAgent)
  } finally {
    isSaving.value = false
  }
}

async function loadWorkbench(agentHandle: string) {
  const workbench = await ApiAiService.getAgentWorkbench(agentHandle)
  workbenchVersions.value = workbench.versions
  workbenchPlaybooks.value = workbench.playbooks
  workbenchMemories.value = workbench.memories
  workbenchRuns.value = workbench.runs
  workbenchEvaluations.value = workbench.evaluations
  workbenchStats.value = workbench.stats
}

function resetWorkbench() {
  workbenchVersions.value = []
  workbenchPlaybooks.value = []
  workbenchMemories.value = []
  workbenchRuns.value = []
  workbenchEvaluations.value = []
  workbenchStats.value = {}
}

async function createVersionFromDraft() {
  if (!selectedAgent.value || !canSaveAgent.value) {
    return
  }

  const nextVersion =
    Math.max(0, ...workbenchVersions.value.map((version) => version.version ?? 0)) + 1
  await ApiGenericService.create<AiAgentVersionItem>('aiAgentVersion', {
    agent: selectedAgent.value.handle,
    version: nextVersion,
    status: workbenchVersions.value.length === 0 ? 'active' : 'draft',
    promptMarkdown: draft.value.promptMarkdown.trim(),
    changelog: 'Snapshot from Agent Workbench',
    provider: draft.value.provider || null,
    model: draft.value.model || null,
    allowedEntityHandles: draft.value.allowedEntityHandles,
    allowedKnowledgeEntityHandles: draft.value.allowedKnowledgeEntityHandles,
    allowedInternalTools: draft.value.allowedInternalTools,
    allowedExternalTools: draft.value.allowedExternalTools,
    activatedAt: workbenchVersions.value.length === 0 ? new Date().toISOString() : null,
  } as Partial<AiAgentVersionItem>)
  await loadWorkbench(selectedAgent.value.handle)
}

async function runAgentTest() {
  if (!selectedAgent.value || !testPrompt.value.trim()) {
    return
  }

  isRunningTest.value = true
  try {
    latestTestRun.value = await ApiAiService.createAgentTestRun(selectedAgent.value.handle, {
      prompt: testPrompt.value.trim(),
      agentVersionHandle: selectedTestVersionHandle.value ?? undefined,
      playbookHandle: selectedTestPlaybookHandle.value ?? undefined,
    })
    await loadWorkbench(selectedAgent.value.handle)
  } finally {
    isRunningTest.value = false
  }
}

async function createEvaluation() {
  if (!selectedAgent.value) {
    return
  }

  await ApiAiService.createAgentEvaluation(selectedAgent.value.handle, {
    title: evaluationDraft.value.title.trim(),
    prompt: evaluationDraft.value.prompt.trim(),
    expectedCriteria: evaluationDraft.value.expectedCriteria.trim() || undefined,
    agentVersionHandle: evaluationDraft.value.agentVersionHandle ?? undefined,
  })
  evaluationDraft.value = {
    title: '',
    prompt: '',
    expectedCriteria: '',
    agentVersionHandle: null,
  }
  await loadWorkbench(selectedAgent.value.handle)
}

function createEmptyDraft(): AgentDraft {
  return {
    handle: '',
    title: '',
    description: null,
    icon: 'mdi-creation',
    color: '#2563eb',
    promptMarkdown: '',
    welcomeMessage: null,
    conversationStarters: [],
    provider: null,
    model: null,
    allowedEntityHandles: [],
    allowedKnowledgeEntityHandles: [],
    allowedInternalTools: [],
    allowedExternalTools: [],
    mutationMode: 'confirm',
    roles: [],
    isActive: true,
    isDefault: false,
    sortOrder: 100,
  }
}

function toDraft(agent: AiAgentItem): AgentDraft {
  return {
    handle: agent.handle,
    title: agent.title,
    description: agent.description ?? null,
    icon: agent.icon ?? 'mdi-creation',
    color: agent.color ?? '#2563eb',
    promptMarkdown: agent.promptMarkdown ?? '',
    welcomeMessage: agent.welcomeMessage ?? null,
    conversationStarters: agent.conversationStarters ?? [],
    provider: getProviderHandle(agent.provider) ?? null,
    model: getModelHandle(agent.model) ?? null,
    allowedEntityHandles: agent.allowedEntityHandles ?? [],
    allowedKnowledgeEntityHandles: agent.allowedKnowledgeEntityHandles ?? [],
    allowedInternalTools: agent.allowedInternalTools ?? [],
    allowedExternalTools: agent.allowedExternalTools ?? [],
    mutationMode: agent.mutationMode || 'confirm',
    roles: normalizeRoleHandles(agent.roles),
    isActive: agent.isActive,
    isDefault: agent.isDefault,
    sortOrder: agent.sortOrder,
  }
}

function toPayload(value: AgentDraft): Partial<AiAgentItem> {
  return {
    handle: value.handle.trim(),
    title: value.title.trim(),
    description: value.description?.trim() || null,
    icon: value.icon?.trim() || null,
    color: value.color?.trim() || null,
    promptMarkdown: value.promptMarkdown.trim(),
    welcomeMessage: value.welcomeMessage?.trim() || null,
    conversationStarters: value.conversationStarters,
    provider: value.provider || null,
    model: value.model || null,
    allowedEntityHandles: value.allowedEntityHandles,
    allowedKnowledgeEntityHandles: value.allowedKnowledgeEntityHandles,
    allowedInternalTools: value.allowedInternalTools,
    allowedExternalTools: value.allowedExternalTools,
    mutationMode: value.mutationMode,
    roles: value.roles,
    isActive: value.isActive,
    isDefault: value.isDefault,
    sortOrder: value.sortOrder,
  }
}

function getProviderHandle(provider?: AiProviderTypeItem | string | null) {
  if (!provider) {
    return null
  }

  return typeof provider === 'string' ? provider : provider.handle
}

function getModelHandle(model?: AiProviderModelItem | string | null) {
  if (!model) {
    return null
  }

  return typeof model === 'string' ? model : model.handle
}

function normalizeRoleHandles(value: unknown): number[] {
  return Array.isArray(value)
    ? value
        .map((item) =>
          typeof item === 'number'
            ? item
            : item && typeof item === 'object'
              ? (item as { handle?: unknown }).handle
              : null,
        )
        .filter((handle): handle is number => typeof handle === 'number')
    : []
}

function mapHandlesToItems<T extends SaplingGenericItem>(
  handles: Array<string | number>,
  items: T[],
): T[] {
  const handleSet = new Set(handles)
  return items.filter((item) => handleSet.has(item.handle))
}

function getStringHandles(items: SaplingGenericItem[]): string[] {
  return items
    .map((item) => item.handle)
    .filter((handle): handle is string => typeof handle === 'string')
}

function getNumberHandles(items: SaplingGenericItem[]): number[] {
  return items
    .map((item) => item.handle)
    .filter((handle): handle is number => typeof handle === 'number')
}

function formatDate(value?: Date | string | null): string {
  if (!value) {
    return t('global.notAvailable')
  }

  return new Date(value).toLocaleString()
}
</script>
