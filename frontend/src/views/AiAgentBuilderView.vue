<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--uniform-inset sapling-config-page sapling-ai-agent-builder"
    fluid
  >
    <SaplingPageHero
      class="sapling-config-hero sapling-ai-agent-builder__hero"
      variant="system"
      :eyebrow="tr('aiAgentBuilder.eyebrow', 'KI Agents')"
      :title="tr('aiAgentBuilder.title', 'AI Agent Builder')"
      :subtitle="
        tr('aiAgentBuilder.subtitle', 'Erstelle zugeschnittene Agents fuer den Sapling Chat.')
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
                :label="tr('aiAgentBuilder.fieldWelcome', 'Begruessung')"
                rows="4"
              />
            </div>
          </v-window-item>

          <v-window-item value="data">
            <div class="sapling-ai-agent-builder__grid">
              <v-select
                v-model="draft.allowedEntityHandles"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :items="entityOptions"
                :label="tr('aiAgentBuilder.fieldEntities', 'Datenbereiche')"
              />
              <v-select
                v-model="draft.allowedKnowledgeEntityHandles"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                :items="knowledgeEntityOptions"
                :label="tr('aiAgentBuilder.fieldKnowledge', 'Wissensquellen')"
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
              <v-select
                v-model="draft.roles"
                class="sapling-ai-agent-builder__wide"
                chips
                multiple
                item-title="title"
                item-value="handle"
                :items="roles"
                :label="tr('aiAgentBuilder.fieldRoles', 'Rollenfreigabe')"
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
import type {
  AiAgentItem,
  AiProviderModelItem,
  AiProviderTypeItem,
  EntityItem,
  RoleItem,
} from '@/entity/entity'
import ApiAiService, { type AiMcpToolDescriptor } from '@/services/api.ai.service'
import ApiGenericService from '@/services/api.generic.service'
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
const isSaving = ref(false)
const translationService = new TranslationService()
const draft = ref(createEmptyDraft())

const isEditingExisting = computed(() => !!selectedAgent.value?.handle)
const activeAgentCount = computed(() => agents.value.filter((agent) => agent.isActive).length)
const canSaveAgent = computed(
  () =>
    !!draft.value.handle.trim() &&
    !!draft.value.title.trim() &&
    !!draft.value.promptMarkdown.trim(),
)
const entityOptions = computed(() => entities.value.map((entity) => entity.handle))
const knowledgeEntityOptions = computed(() =>
  entityOptions.value.filter((handle) =>
    (KNOWLEDGE_ENTITY_HANDLES as readonly string[]).includes(handle),
  ),
)
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
const mutationModeOptions = computed(() => [
  {
    title: tr('aiAgentBuilder.mutationConfirm', 'Aenderungen bestaetigen lassen'),
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

function tr(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback
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
    : tr('aiAgentBuilder.mutationConfirm', 'Aenderungen bestaetigen lassen')
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
</script>

<style scoped>
.sapling-ai-agent-builder__workspace {
  display: grid;
  grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
  gap: var(--sapling-gap-lg);
  min-height: 0;
}

.sapling-ai-agent-builder__hero-actions {
  justify-content: flex-end;
}

.sapling-ai-agent-builder__rail {
  display: flex;
  flex-direction: column;
  gap: var(--sapling-gap-md);
  min-width: 0;
  min-height: 32rem;
  padding: var(--sapling-space-lg);
}

.sapling-ai-agent-builder__rail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sapling-gap-md);
  font-weight: 700;
}

.sapling-ai-agent-builder__editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 32rem;
  padding: var(--sapling-space-lg);
}

.sapling-ai-agent-builder__list {
  min-height: 0;
  overflow: auto;
  background: transparent;
}

.sapling-ai-agent-builder__tabs {
  flex: 0 0 auto;
}

.sapling-ai-agent-builder__window {
  min-width: 0;
  flex: 1 1 auto;
}

.sapling-ai-agent-builder__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sapling-gap-md);
  padding-top: var(--sapling-space-lg);
}

.sapling-ai-agent-builder__wide {
  grid-column: 1 / -1;
}

.sapling-ai-agent-builder__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sapling-gap-sm);
  padding-top: var(--sapling-space-md);
}

@media (max-width: 960px) {
  .sapling-ai-agent-builder__workspace,
  .sapling-ai-agent-builder__grid {
    grid-template-columns: 1fr;
  }

  .sapling-ai-agent-builder__rail,
  .sapling-ai-agent-builder__editor {
    min-height: auto;
  }
}
</style>
