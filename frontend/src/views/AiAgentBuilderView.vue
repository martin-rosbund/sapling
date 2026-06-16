<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--uniform-inset sapling-config-page sapling-ai-agent-builder"
    fluid
  >
    <SaplingPageHero
      class="sapling-config-hero sapling-ai-agent-builder__hero"
      variant="system"
      :eyebrow="tr('aiAgentBuilder.eyebrow', 'KI Agents')"
      :title="tr('aiAgentBuilder.title', 'Agent Workbench')"
      :subtitle="
        tr(
          'aiAgentBuilder.subtitle',
          'Konfiguriere, versioniere und prüfe zugeschnittene Agents für den Sapling Chat.',
        )
      "
    >
      <template #meta>
        <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-creation">
          {{ agents.length }} {{ tr('aiAgentBuilder.agentCount', 'Agents') }}
        </v-chip>
        <v-chip size="small" variant="outlined" prepend-icon="mdi-check-circle-outline">
          {{ activeAgentCount }} {{ tr('aiAgentBuilder.activeAgents', 'aktiv') }}
        </v-chip>
      </template>

      <template #side>
        <div class="sapling-action-cluster sapling-ai-agent-builder__hero-actions">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="startNewAgent">
            {{ tr('aiAgentBuilder.newAgent', 'Neuer Agent') }}
          </v-btn>
        </div>
      </template>
    </SaplingPageHero>

    <section class="sapling-config-workspace sapling-ai-agent-builder__workspace">
      <SaplingSurface
        class="sapling-panel-shell sapling-section-panel sapling-config-panel sapling-config-panel--blurred sapling-ai-agent-builder__rail"
      >
        <div class="sapling-ai-agent-builder__rail-header">
          <span>{{ tr('aiAgentBuilder.agentList', 'Agents') }}</span>
          <v-btn
            icon="mdi-plus"
            variant="tonal"
            size="small"
            :title="tr('aiAgentBuilder.newAgent', 'Neuer Agent')"
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
          <v-tab value="profile">{{ tr('aiAgentBuilder.tabProfile', 'Profil') }}</v-tab>
          <v-tab value="prompt">{{ tr('aiAgentBuilder.tabPrompt', 'Prompt') }}</v-tab>
          <v-tab value="data">{{ tr('aiAgentBuilder.tabData', 'Daten') }}</v-tab>
          <v-tab value="tools">{{ tr('aiAgentBuilder.tabTools', 'Tools') }}</v-tab>
          <v-tab value="runtime">{{ tr('aiAgentBuilder.tabRuntime', 'Modell') }}</v-tab>
          <v-tab value="release">{{ tr('aiAgentBuilder.tabRelease', 'Freigabe') }}</v-tab>
          <v-tab value="versions">{{ tr('aiAgentBuilder.tabVersions', 'Versionen') }}</v-tab>
          <v-tab value="test">{{ tr('aiAgentBuilder.tabTestRuns', 'Testläufe') }}</v-tab>
          <v-tab value="memory">{{ tr('aiAgentBuilder.tabMemory', 'Quellen/Memory') }}</v-tab>
          <v-tab value="quality">{{ tr('aiAgentBuilder.tabQuality', 'Qualität') }}</v-tab>
          <v-tab value="usage">{{ tr('aiAgentBuilder.tabUsage', 'Nutzung') }}</v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="sapling-ai-agent-builder__window">
          <v-window-item value="profile">
            <div class="sapling-ai-agent-builder__grid">
              <v-text-field
                v-model="draft.handle"
                :disabled="isEditingExisting"
                label="Handle"
                required
              />
              <v-text-field
                v-model="draft.title"
                :label="tr('aiAgentBuilder.fieldTitle', 'Titel')"
                required
              />
              <v-text-field v-model="draft.icon" :label="tr('aiAgentBuilder.fieldIcon', 'Icon')" />
              <v-text-field
                v-model="draft.color"
                :label="tr('aiAgentBuilder.fieldColor', 'Farbe')"
              />
              <v-textarea
                v-model="draft.description"
                class="sapling-ai-agent-builder__wide"
                :label="tr('aiAgentBuilder.fieldDescription', 'Beschreibung')"
                rows="3"
              />
              <v-combobox
                v-model="draft.conversationStarters"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :label="tr('aiAgentBuilder.fieldStarters', 'Startfragen')"
              />
            </div>
          </v-window-item>

          <v-window-item value="prompt">
            <div class="sapling-ai-agent-builder__grid">
              <v-textarea
                v-model="draft.promptMarkdown"
                class="sapling-ai-agent-builder__wide"
                :label="tr('aiAgentBuilder.fieldPrompt', 'Agent Prompt')"
                rows="12"
                required
              />
              <v-textarea
                v-model="draft.welcomeMessage"
                class="sapling-ai-agent-builder__wide"
                :label="tr('aiAgentBuilder.fieldWelcome', 'Begrüßung')"
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
                :label="tr('aiAgentBuilder.fieldEntities', 'Datenbereiche')"
                density="comfortable"
                hide-details
              />
              <SaplingFieldSelect
                v-model="selectedAllowedKnowledgeEntities"
                class="sapling-ai-agent-builder__wide"
                entity-handle="entity"
                :parent-filter="knowledgeEntityFilter"
                :label="tr('aiAgentBuilder.fieldKnowledge', 'Wissensquellen')"
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
                :label="tr('aiAgentBuilder.fieldInternalTools', 'Sapling Tools')"
              />
              <v-select
                v-model="draft.allowedExternalTools"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :items="externalToolOptions"
                :label="tr('aiAgentBuilder.fieldExternalTools', 'Externe Tools')"
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
                :label="tr('aiAgentBuilder.fieldProvider', 'Provider')"
                clearable
              />
              <v-select
                v-model="draft.model"
                item-title="title"
                item-value="handle"
                :items="filteredModels"
                :label="tr('aiAgentBuilder.fieldModel', 'Modell')"
                clearable
              />
              <v-select
                v-model="draft.mutationMode"
                :items="mutationModeOptions"
                :label="tr('aiAgentBuilder.fieldMutationMode', 'Aktionsmodus')"
              />
            </div>
          </v-window-item>

          <v-window-item value="release">
            <div class="sapling-ai-agent-builder__grid">
              <SaplingFieldSelect
                v-model="selectedRoles"
                class="sapling-ai-agent-builder__wide"
                entity-handle="role"
                :label="tr('aiAgentBuilder.fieldRoles', 'Rollenfreigabe')"
                density="comfortable"
                hide-details
              />
              <v-switch
                v-model="draft.isActive"
                :label="tr('aiAgentBuilder.fieldActive', 'Aktiv')"
              />
              <v-switch
                v-model="draft.isDefault"
                :label="tr('aiAgentBuilder.fieldDefault', 'Standard-Agent')"
              />
              <v-text-field
                v-model.number="draft.sortOrder"
                type="number"
                :label="tr('aiAgentBuilder.fieldSortOrder', 'Sortierung')"
              />
            </div>
          </v-window-item>

          <v-window-item value="versions">
            <div class="sapling-ai-agent-builder__panel-stack">
              <div class="sapling-row-between-xs">
                <div>
                  <strong>{{ tr('aiAgentBuilder.versionsTitle', 'Agent-Versionen') }}</strong>
                  <p>
                    {{
                      tr(
                        'aiAgentBuilder.versionsSubtitle',
                        'Versionen halten produktive Chats nachvollziehbar.',
                      )
                    }}
                  </p>
                </div>
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-source-branch-plus"
                  :disabled="!selectedAgent"
                  @click="createVersionFromDraft"
                >
                  {{ tr('aiAgentBuilder.createVersion', 'Version aus Entwurf') }}
                </v-btn>
              </div>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>{{ tr('aiAgentBuilder.fieldProvider', 'Provider') }}</th>
                    <th>{{ tr('aiAgentBuilder.fieldModel', 'Modell') }}</th>
                    <th>{{ tr('aiAgentBuilder.updatedAt', 'Aktualisiert') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="version in workbenchVersions" :key="version.handle ?? version.version">
                    <td>v{{ version.version }}</td>
                    <td>
                      <v-chip size="small" variant="tonal">{{ version.status }}</v-chip>
                    </td>
                    <td>{{ getProviderHandle(version.provider) || '-' }}</td>
                    <td>{{ getModelHandle(version.model) || '-' }}</td>
                    <td>{{ formatDate(version.updatedAt) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>

          <v-window-item value="test">
            <div class="sapling-ai-agent-builder__panel-stack">
              <v-textarea
                v-model="testPrompt"
                :label="tr('aiAgentBuilder.testPrompt', 'Testprompt')"
                rows="5"
              />
              <div class="sapling-row-md">
                <v-select
                  v-model="selectedTestVersionHandle"
                  :items="versionOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  :label="tr('aiAgentBuilder.testVersion', 'Version')"
                />
                <v-select
                  v-model="selectedTestPlaybookHandle"
                  :items="playbookOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  :label="tr('aiAgentBuilder.testPlaybook', 'Playbook')"
                />
                <v-btn
                  color="primary"
                  prepend-icon="mdi-play-circle-outline"
                  :disabled="!selectedAgent || !testPrompt.trim()"
                  :loading="isRunningTest"
                  @click="runAgentTest"
                >
                  {{ tr('aiAgentBuilder.runTest', 'Testlauf starten') }}
                </v-btn>
              </div>
              <v-alert v-if="latestTestRun" type="info" variant="tonal">
                {{ latestTestRun.status }} - {{ latestTestRun.durationMs ?? '-' }} ms
              </v-alert>
            </div>
          </v-window-item>

          <v-window-item value="memory">
            <div class="sapling-ai-agent-builder__panel-stack">
              <strong>{{ tr('aiAgentBuilder.memoryTitle', 'Quellen und Memory') }}</strong>
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
                {{ tr('aiAgentBuilder.noMemory', 'Noch kein Memory für diesen Agent gepflegt.') }}
              </v-alert>
            </div>
          </v-window-item>

          <v-window-item value="quality">
            <div class="sapling-ai-agent-builder__panel-stack">
              <div class="sapling-ai-agent-builder__grid">
                <v-text-field
                  v-model="evaluationDraft.title"
                  :label="tr('aiAgentBuilder.evaluationTitle', 'Testfall')"
                />
                <v-select
                  v-model="evaluationDraft.agentVersionHandle"
                  :items="versionOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  :label="tr('aiAgentBuilder.testVersion', 'Version')"
                />
                <v-textarea
                  v-model="evaluationDraft.prompt"
                  class="sapling-ai-agent-builder__wide"
                  :label="tr('aiAgentBuilder.testPrompt', 'Testprompt')"
                  rows="4"
                />
                <v-textarea
                  v-model="evaluationDraft.expectedCriteria"
                  class="sapling-ai-agent-builder__wide"
                  :label="tr('aiAgentBuilder.expectedCriteria', 'Erwartete Kriterien')"
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
                {{ tr('aiAgentBuilder.createEvaluation', 'Testfall anlegen') }}
              </v-btn>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>{{ tr('aiAgentBuilder.evaluationTitle', 'Testfall') }}</th>
                    <th>Status</th>
                    <th>{{ tr('aiAgentBuilder.updatedAt', 'Aktualisiert') }}</th>
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
                  >{{ workbenchStats.runsTotal ?? 0 }} Runs</v-chip
                >
                <v-chip variant="tonal">{{ workbenchStats.failedRuns ?? 0 }} Fehler</v-chip>
                <v-chip variant="tonal">{{ workbenchStats.pendingActions ?? 0 }} Actions</v-chip>
                <v-chip variant="tonal">
                  {{ workbenchStats.evaluationPassRate ?? '-' }}%
                  {{ tr('aiAgentBuilder.tabQuality', 'Qualität') }}
                </v-chip>
              </div>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>{{ tr('aiAgentBuilder.fieldModel', 'Modell') }}</th>
                    <th>ms</th>
                    <th>{{ tr('aiAgentBuilder.updatedAt', 'Aktualisiert') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(run, runIndex) in workbenchRuns"
                    :key="run.handle ?? `run-${run.startedAt ?? runIndex}`"
                  >
                    <td>
                      <v-chip size="small" variant="tonal">{{ run.status }}</v-chip>
                    </td>
                    <td>{{ run.model || '-' }}</td>
                    <td>{{ run.durationMs ?? '-' }}</td>
                    <td>{{ formatDate(run.completedAt || run.startedAt) }}</td>
                  </tr>
                </tbody>
              </v-table>
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

const { t, te } = useI18n()
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
    title: tr('aiAgentBuilder.mutationConfirm', 'Änderungen bestätigen lassen'),
    value: 'confirm',
  },
  { title: tr('aiAgentBuilder.mutationReadOnly', 'Nur lesen'), value: 'readOnly' },
])

onMounted(async () => {
  await Promise.all([
    translationService.prepare('aiAgentBuilder', 'aiAgent', 'aiChatToolAction', 'navigation'),
    loadAgents(),
    loadReferenceData(),
  ])
  selectAgent(agents.value.find((agent) => agent.isDefault) ?? agents.value[0] ?? null)
})

function tr(key: string, _fallback: string): string {
  void _fallback
  return te(key) ? t(key) : ''
}

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
    return tr('aiAgentBuilder.defaultAgent', 'Standard')
  }

  return agent.mutationMode === 'readOnly'
    ? tr('aiAgentBuilder.mutationReadOnly', 'Nur lesen')
    : tr('aiAgentBuilder.mutationConfirm', 'Änderungen bestätigen lassen')
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
    return '-'
  }

  return new Date(value).toLocaleString()
}
</script>
