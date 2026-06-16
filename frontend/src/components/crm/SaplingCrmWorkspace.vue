<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--fill sapling-page-shell--uniform-inset sapling-crm-workspace"
    fluid
  >
    <SaplingPageHero
      class="sapling-crm-workspace__hero"
      variant="workspace"
      :eyebrow="t('navigation.crmWorkspace')"
      :title="t('crmWorkspace.title')"
    >
      <template #title-prefix>
        <v-icon size="30">mdi-view-dashboard-variant-outline</v-icon>
      </template>

      <p class="sapling-crm-workspace__subtitle">
        {{ t('crmWorkspace.subtitle') }}
      </p>

      <template #side>
        <div class="sapling-crm-workspace__hero-side">
          <article
            v-for="metric in heroMetrics"
            :key="metric.key"
            class="sapling-crm-workspace-metric"
          >
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>

          <v-btn
            class="sapling-crm-workspace__refresh"
            prepend-icon="mdi-refresh"
            variant="text"
            :disabled="isLoading"
            @click="loadData"
          >
            {{ t('global.refresh') }}
          </v-btn>
        </div>
      </template>
    </SaplingPageHero>

    <SaplingCrmWorkspaceToolbar
      v-model:active-cockpit="activeCockpit"
      v-model:search="search"
      v-model:selected-responsible-handle="selectedResponsibleHandle"
      v-model:contact-threshold-days="contactThresholdDays"
      :responsible-person-options="responsiblePersonOptions"
      :contact-threshold-options="contactThresholdOptions"
    />

    <v-progress-linear
      v-if="isLoading && hasLoadedOnce"
      class="sapling-crm-workspace__progress"
      color="primary"
      indeterminate
    />

    <section v-if="isBootstrapping" class="sapling-crm-workspace__loading-grid">
      <v-skeleton-loader
        v-for="item in 6"
        :key="item"
        class="sapling-crm-workspace__loading-card"
        type="article, list-item-two-line"
      />
    </section>

    <section v-else class="sapling-crm-workspace__layout">
      <main class="sapling-crm-workspace__main">
        <section v-if="activeCockpit === 'sales'" class="sapling-crm-workspace-panel glass-panel">
          <header class="sapling-crm-workspace-panel__header">
            <div>
              <p class="sapling-eyebrow">{{ t('crmWorkspace.salesCockpit') }}</p>
              <h2>{{ t('crmWorkspace.salesFocus') }}</h2>
            </div>
            <v-chip variant="tonal" color="primary">
              {{ filteredOpenOpportunities.length }}
            </v-chip>
          </header>

          <div class="sapling-crm-workspace__stage-grid">
            <button
              v-for="stage in salesStageBreakdown"
              :key="stage.key"
              class="sapling-crm-stage"
              type="button"
              :style="{ '--sapling-crm-stage-color': stage.color }"
              @click="openOpportunityStage(stage)"
            >
              <div class="sapling-crm-stage__bar" />
              <span>{{ stage.label }}</span>
              <strong>{{ stage.count }}</strong>
              <small>{{ formatMoney(stage.value) }}</small>
            </button>
          </div>

          <SaplingCrmWorkspaceList
            :title="t('crmWorkspace.opportunitiesWithoutNextActivity')"
            :items="opportunitiesWithoutNextActivityItems"
            empty-icon="mdi-calendar-check-outline"
            :empty-text="t('crmWorkspace.noOpenOpportunityGaps')"
            @open="openWorkspaceItem"
          />
        </section>

        <section
          v-else-if="activeCockpit === 'account'"
          class="sapling-crm-workspace-panel glass-panel"
        >
          <header class="sapling-crm-workspace-panel__header">
            <div>
              <p class="sapling-eyebrow">{{ t('crmWorkspace.accountCockpit') }}</p>
              <h2>{{ t('crmWorkspace.accountFocus') }}</h2>
            </div>
            <v-chip variant="tonal" color="info">
              {{ filteredCompanies.length }}
            </v-chip>
          </header>

          <div class="sapling-crm-account-grid">
            <button
              v-for="company in topAccountItems"
              :key="company.id"
              class="sapling-crm-account-card"
              type="button"
              @click="openWorkspaceItem(company)"
            >
              <span class="sapling-crm-account-card__title">{{ company.title }}</span>
              <span class="sapling-crm-account-card__meta">{{ company.subtitle }}</span>
              <span v-if="company.owner" class="sapling-crm-account-card__owner">
                <v-icon icon="mdi-account-tie-outline" size="14" />
                {{ company.owner }}
              </span>
              <span class="sapling-crm-account-card__footer">
                <span class="sapling-crm-account-card__badge">
                  {{ company.badge }}
                </span>
                <strong>{{ company.value }}</strong>
              </span>
            </button>
          </div>

          <SaplingCrmWorkspaceList
            :title="t('crmWorkspace.customersWithoutContact')"
            :items="customersWithoutContactItems"
            empty-icon="mdi-account-check-outline"
            :empty-text="t('crmWorkspace.noCustomerContactGaps')"
            @open="openWorkspaceItem"
          />
        </section>

        <section v-else class="sapling-crm-workspace-panel glass-panel">
          <header class="sapling-crm-workspace-panel__header">
            <div>
              <p class="sapling-eyebrow">{{ t('crmWorkspace.customerSuccessCockpit') }}</p>
              <h2>{{ t('crmWorkspace.customerSuccessFocus') }}</h2>
            </div>
            <v-chip variant="tonal" color="warning">
              {{ atRiskCustomerItems.length }}
            </v-chip>
          </header>

          <SaplingCrmWorkspaceList
            :title="t('crmWorkspace.atRiskCustomers')"
            :items="atRiskCustomerItems"
            empty-icon="mdi-shield-check-outline"
            :empty-text="t('crmWorkspace.noCustomerRisks')"
            @open="openWorkspaceItem"
          />

          <SaplingCrmWorkspaceList
            :title="t('crmWorkspace.customersWithoutContact')"
            :items="customersWithoutContactItems"
            empty-icon="mdi-account-check-outline"
            :empty-text="t('crmWorkspace.noCustomerContactGaps')"
            @open="openWorkspaceItem"
          />
        </section>
      </main>

      <aside class="sapling-crm-workspace__side">
        <SaplingCrmWorkspaceList
          class="sapling-crm-workspace__priority-list"
          :title="t('crmWorkspace.contactToday')"
          :items="todayContactItems"
          empty-icon="mdi-phone-check-outline"
          :empty-text="t('crmWorkspace.noContactToday')"
          @open="openWorkspaceItem"
        />

        <section
          class="sapling-crm-workspace-panel sapling-crm-workspace-panel--compact glass-panel"
        >
          <header class="sapling-crm-workspace-panel__header">
            <div>
              <p class="sapling-eyebrow">{{ t('crmWorkspace.signalOverview') }}</p>
              <h2>{{ t('crmWorkspace.pipelineHealth') }}</h2>
            </div>
          </header>

          <div class="sapling-crm-signal-list">
            <button
              v-for="signal in signals"
              :key="signal.key"
              class="sapling-crm-signal"
              type="button"
              @click="openSignal(signal)"
            >
              <v-icon :icon="signal.icon" size="18" />
              <span>{{ signal.label }}</span>
              <strong>{{ signal.value }}</strong>
            </button>
          </div>
        </section>
      </aside>
    </section>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type {
  CompanyItem,
  EventItem,
  PersonItem,
  PhoneCallItem,
  SalesOpportunityItem,
} from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingCrmWorkspaceList, {
  type CrmWorkspaceItem,
} from '@/components/crm/SaplingCrmWorkspaceList.vue'
import SaplingCrmWorkspaceToolbar, {
  type CrmCockpitKey,
} from '@/components/crm/SaplingCrmWorkspaceToolbar.vue'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useGenericStore } from '@/stores/genericStore'
import { pushAppRoute } from '@/utils/routerNavigation'

type SignalKey = 'noActivity' | 'contactGaps' | 'risks'

interface RelationHandle {
  handle?: string | number | null
  title?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  color?: string | null
  icon?: string | null
  isClosed?: boolean | null
  isSuccess?: boolean | null
}

interface CrmCompany extends CompanyItem {
  accountManager?: PersonItem | number | null
  customerSuccessManager?: PersonItem | number | null
  segment?: RelationHandle | string | null
  industry?: RelationHandle | string | null
  size?: RelationHandle | string | null
  annualRevenueClass?: RelationHandle | string | null
  churnRiskReason?: RelationHandle | string | null
  annualRecurringRevenue?: number | null
  monthlyRecurringRevenue?: number | null
  contractValue?: number | null
  dataPrivacyConsentGiven?: boolean | null
  dataPrivacyConsentAt?: Date | string | null
}

interface CrmPerson extends PersonItem {
  salutation?: RelationHandle | string | null
  title?: RelationHandle | string | null
  jobTitle?: RelationHandle | string | null
  jobFunction?: RelationHandle | string | null
  decisionRole?: RelationHandle | string | null
}

interface CrmOpportunity extends Omit<SalesOpportunityItem, 'events'> {
  resultStatus?: RelationHandle | string | null
  lossReason?: RelationHandle | string | null
  competitors?: CrmCompany[] | number[]
  events?: CrmEvent[]
}

interface CrmEvent extends Omit<EventItem, 'creatorCompany' | 'creatorPerson' | 'participants'> {
  assigneeCompany?: CrmCompany | number | null
  assigneePerson?: CrmPerson | number | null
  creatorCompany?: CrmCompany | number | null
  creatorPerson?: CrmPerson | number | null
  salesOpportunity?: CrmOpportunity | number | null
  participants?: CrmPerson[]
}

interface StageBreakdown {
  key: string
  label: string
  count: number
  value: number
  color: string
}

interface CrmSignal {
  key: SignalKey
  icon: string
  label: string
  value: string
}

const COMPANY_ENTITY = 'company'
const PERSON_ENTITY = 'person'
const OPPORTUNITY_ENTITY = 'salesOpportunity'
const EVENT_ENTITY = 'event'
const PHONE_CALL_ENTITY = 'phoneCall'

const COMPANY_RELATIONS = [
  'accountManager',
  'customerSuccessManager',
  'industry',
  'segment',
  'size',
  'annualRevenueClass',
  'churnRiskReason',
  'persons',
]
const PERSON_RELATIONS = [
  'company',
  'salutation',
  'title',
  'jobTitle',
  'jobFunction',
  'decisionRole',
]
const OPPORTUNITY_RELATIONS = [
  'type',
  'forecast',
  'source',
  'assigneeCompany',
  'assigneePerson',
  'creatorCompany',
  'creatorPerson',
  'events',
  'resultStatus',
  'lossReason',
  'competitors',
]
const EVENT_RELATIONS = [
  'type',
  'status',
  'assigneeCompany',
  'assigneePerson',
  'creatorCompany',
  'creatorPerson',
  'participants',
  'salesOpportunity',
]
const PHONE_CALL_RELATIONS = ['entity', 'person']

const { t, d, n, locale } = useI18n()
const router = useRouter()
const genericStore = useGenericStore()
const currentPersonStore = useCurrentPersonStore()

const activeCockpit = ref<CrmCockpitKey>('sales')
const contactThresholdDays = ref(45)
const search = ref('')
const selectedResponsibleHandle = ref<string | null>(null)
const companies = ref<CrmCompany[]>([])
const people = ref<CrmPerson[]>([])
const opportunities = ref<CrmOpportunity[]>([])
const events = ref<CrmEvent[]>([])
const phoneCalls = ref<PhoneCallItem[]>([])
const isLoading = ref(false)
const hasLoadedOnce = ref(false)

const contactThresholdOptions = computed(() => [
  { title: t('crmWorkspace.days30'), value: 30 },
  { title: t('crmWorkspace.days45'), value: 45 },
  { title: t('crmWorkspace.days60'), value: 60 },
  { title: t('crmWorkspace.days90'), value: 90 },
])
const responsiblePersonOptions = computed(() =>
  people.value
    .filter((person) => person.handle != null)
    .map((person) => ({
      title: personLabel(person),
      value: String(person.handle),
    }))
    .sort((left, right) => left.title.localeCompare(right.title)),
)

const isBootstrapping = computed(() => isLoading.value && !hasLoadedOnce.value)
const normalizedSearch = computed(() => normalizeText(search.value))

const companyByHandle = computed(
  () => new Map(companies.value.map((company) => [String(company.handle), company])),
)
const personByHandle = computed(
  () =>
    new Map(
      people.value
        .filter((person) => person.handle != null)
        .map((person) => [String(person.handle), person]),
    ),
)

const filteredCompanies = computed(() =>
  companies.value.filter(
    (company) =>
      matchesSearch(
        company.name,
        relationLabel(company.segment),
        relationLabel(company.industry),
        accountOwnerLabel(company),
        csOwnerLabel(company),
      ) && matchesCompanyResponsibleFilter(company),
  ),
)
const openOpportunities = computed(() => opportunities.value.filter(isOpportunityOpen))
const filteredOpenOpportunities = computed(() =>
  openOpportunities.value.filter(
    (opportunity) =>
      matchesSearch(
        opportunity.title,
        opportunity.nextStep,
        companyLabel(opportunity.assigneeCompany ?? opportunity.creatorCompany),
        personLabel(opportunity.assigneePerson ?? opportunity.creatorPerson),
      ) && matchesOpportunityResponsibleFilter(opportunity),
  ),
)
const opportunityFutureActivity = computed(() => buildFutureActivityByOpportunity())
const lastCompanyContact = computed(() => buildLastContactByCompany())
const customersWithoutContact = computed(() => {
  const today = startOfDay(new Date())

  return filteredCompanies.value
    .filter(isCustomerCompany)
    .map((company) => ({
      company,
      lastContact: lastCompanyContact.value.get(String(company.handle)) ?? null,
    }))
    .map(({ company, lastContact }) => ({
      company,
      lastContact,
      days: lastContact ? diffInDays(today, startOfDay(lastContact)) : Number.POSITIVE_INFINITY,
    }))
    .filter((entry) => entry.days >= contactThresholdDays.value)
    .sort(
      (left, right) =>
        right.days - left.days || companyValue(right.company) - companyValue(left.company),
    )
})

const opportunitiesWithoutNextActivity = computed(() =>
  filteredOpenOpportunities.value
    .filter((opportunity) => {
      if (opportunity.handle == null) {
        return false
      }

      return !opportunityFutureActivity.value.has(String(opportunity.handle))
    })
    .sort((left, right) => {
      const leftDate = parseDate(left.closeDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const rightDate = parseDate(right.closeDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return (
        leftDate - rightDate ||
        normalizeMoney(right.expectedRevenue) - normalizeMoney(left.expectedRevenue)
      )
    }),
)

const customersWithoutContactItems = computed<CrmWorkspaceItem[]>(() =>
  customersWithoutContact.value.slice(0, 12).map(({ company, days }) => ({
    id: `company-contact-${company.handle}`,
    entity: COMPANY_ENTITY,
    handle: company.handle,
    title: company.name,
    subtitle: relationLabel(company.segment) || relationLabel(company.industry),
    owner: accountOwnerLabel(company),
    value: Number.isFinite(days)
      ? t('crmWorkspace.daysAgo', { count: days })
      : t('crmWorkspace.noContact'),
    badge: relationLabel(company.segment),
    tone: days >= 90 ? 'error' : 'warning',
    icon: 'mdi-account-clock-outline',
  })),
)

const opportunitiesWithoutNextActivityItems = computed<CrmWorkspaceItem[]>(() =>
  opportunitiesWithoutNextActivity.value.slice(0, 12).map((opportunity) => ({
    id: `opportunity-activity-${opportunity.handle}`,
    entity: OPPORTUNITY_ENTITY,
    handle: opportunity.handle,
    title: opportunity.title,
    subtitle: companyLabel(opportunity.assigneeCompany ?? opportunity.creatorCompany),
    owner: opportunityOwnerLabel(opportunity),
    value: formatMoney(opportunity.expectedRevenue),
    badge: formatDate(opportunity.closeDate),
    tone: getOpportunityUrgencyTone(opportunity),
    icon: 'mdi-calendar-alert-outline',
  })),
)

const atRiskCustomerItems = computed<CrmWorkspaceItem[]>(() =>
  filteredCompanies.value
    .filter(
      (company) =>
        isCustomerCompany(company) && (company.churnRiskReason || isCompanyContactOverdue(company)),
    )
    .sort((left, right) => companyRiskScore(right) - companyRiskScore(left))
    .slice(0, 12)
    .map((company) => ({
      id: `company-risk-${company.handle}`,
      entity: COMPANY_ENTITY,
      handle: company.handle,
      title: company.name,
      subtitle: relationLabel(company.churnRiskReason) || t('crmWorkspace.contactRisk'),
      owner: csOwnerLabel(company),
      value: formatMoney(company.annualRecurringRevenue ?? company.contractValue),
      badge: relationLabel(company.segment),
      tone: company.churnRiskReason ? 'error' : 'warning',
      icon: 'mdi-alert-decagram-outline',
    })),
)

const todayContactItems = computed<CrmWorkspaceItem[]>(() => {
  const urgentOpportunityItems = opportunitiesWithoutNextActivity.value
    .slice(0, 7)
    .map((opportunity) => {
      const person = resolvePerson(opportunity.assigneePerson ?? opportunity.creatorPerson)
      return {
        id: `contact-opportunity-${opportunity.handle}`,
        entity: person?.handle ? PERSON_ENTITY : OPPORTUNITY_ENTITY,
        handle: person?.handle ?? opportunity.handle,
        title: person ? personLabel(person) : opportunity.title,
        subtitle: companyLabel(opportunity.assigneeCompany ?? opportunity.creatorCompany),
        owner: opportunityOwnerLabel(opportunity),
        value: formatMoney(opportunity.expectedRevenue),
        badge: t('crmWorkspace.noNextActivity'),
        tone: getOpportunityUrgencyTone(opportunity),
        icon: 'mdi-phone-outgoing-outline',
      } satisfies CrmWorkspaceItem
    })

  const accountItems = customersWithoutContact.value.slice(0, 7).map(
    ({ company, days }) =>
      ({
        id: `contact-account-${company.handle}`,
        entity: COMPANY_ENTITY,
        handle: company.handle,
        title: company.name,
        subtitle: relationLabel(company.segment) || relationLabel(company.industry),
        owner: accountOwnerLabel(company),
        value: Number.isFinite(days)
          ? t('crmWorkspace.daysAgo', { count: days })
          : t('crmWorkspace.noContact'),
        badge: t('crmWorkspace.customerContactGap'),
        tone: days >= 90 ? 'error' : 'warning',
        icon: 'mdi-phone-sync-outline',
      }) satisfies CrmWorkspaceItem,
  )

  return [...urgentOpportunityItems, ...accountItems]
    .filter(
      (item, index, allItems) =>
        allItems.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 10)
})

const topAccountItems = computed<CrmWorkspaceItem[]>(() =>
  filteredCompanies.value
    .filter(isCustomerCompany)
    .sort((left, right) => companyValue(right) - companyValue(left))
    .slice(0, 12)
    .map((company) => ({
      id: `account-${company.handle}`,
      entity: COMPANY_ENTITY,
      handle: company.handle,
      title: company.name,
      subtitle: relationLabel(company.industry) || relationLabel(company.segment),
      owner: accountOwnerLabel(company),
      value: formatMoney(company.annualRecurringRevenue ?? company.contractValue),
      badge: relationLabel(company.size) || relationLabel(company.segment),
      tone: company.churnRiskReason ? 'warning' : 'default',
      icon: 'mdi-domain',
    })),
)

const salesStageBreakdown = computed<StageBreakdown[]>(() => {
  const stages = new Map<string, StageBreakdown>()

  filteredOpenOpportunities.value.forEach((opportunity) => {
    const stage = relationObject(opportunity.type)
    const key = String(stage?.handle ?? 'unknown')
    const current = stages.get(key) ?? {
      key,
      label: stage?.title || t('crmWorkspace.noStage'),
      count: 0,
      value: 0,
      color: stage?.color || '#93C5FD',
    }
    current.count += 1
    current.value += normalizeMoney(opportunity.expectedRevenue)
    stages.set(key, current)
  })

  return [...stages.values()].sort((left, right) => right.value - left.value)
})

const openPipelineValue = computed(() =>
  filteredOpenOpportunities.value.reduce(
    (sum, opportunity) => sum + normalizeMoney(opportunity.expectedRevenue),
    0,
  ),
)
const weightedPipelineValue = computed(() =>
  filteredOpenOpportunities.value.reduce(
    (sum, opportunity) =>
      sum +
      normalizeMoney(opportunity.expectedRevenue) *
        (normalizeProbability(opportunity.probability) / 100),
    0,
  ),
)
const totalArr = computed(() =>
  filteredCompanies.value.reduce(
    (sum, company) => sum + normalizeMoney(company.annualRecurringRevenue),
    0,
  ),
)
const riskCustomerCount = computed(() => atRiskCustomerItems.value.length)

const heroMetrics = computed(() => [
  {
    key: 'openPipeline',
    label: t('crmWorkspace.openPipeline'),
    value: formatMoney(openPipelineValue.value),
  },
  {
    key: 'weightedPipeline',
    label: t('crmWorkspace.weightedPipeline'),
    value: formatMoney(weightedPipelineValue.value),
  },
  { key: 'totalArr', label: t('crmWorkspace.totalArr'), value: formatMoney(totalArr.value) },
  {
    key: 'contactToday',
    label: t('crmWorkspace.contactToday'),
    value: n(todayContactItems.value.length),
  },
])

const signals = computed<CrmSignal[]>(() => [
  {
    key: 'noActivity',
    icon: 'mdi-calendar-alert-outline',
    label: t('crmWorkspace.opportunitiesWithoutNextActivity'),
    value: n(opportunitiesWithoutNextActivity.value.length),
  },
  {
    key: 'contactGaps',
    icon: 'mdi-account-clock-outline',
    label: t('crmWorkspace.customersWithoutContact'),
    value: n(customersWithoutContact.value.length),
  },
  {
    key: 'risks',
    icon: 'mdi-alert-decagram-outline',
    label: t('crmWorkspace.atRiskCustomers'),
    value: n(riskCustomerCount.value),
  },
])

onMounted(async () => {
  await Promise.all([
    genericStore.loadGenericMany([
      { entityHandle: COMPANY_ENTITY, namespaces: ['global', 'navigation', 'crmWorkspace'] },
      { entityHandle: PERSON_ENTITY, namespaces: ['global', 'navigation', 'crmWorkspace'] },
      { entityHandle: OPPORTUNITY_ENTITY, namespaces: ['global', 'navigation', 'crmWorkspace'] },
    ]),
    currentPersonStore.fetchCurrentPerson(),
  ])
  applyDefaultResponsibleFilter()
  await loadData()
})

async function loadData(): Promise<void> {
  isLoading.value = true

  try {
    const [companyResponse, personResponse, opportunityResponse, eventResponse, phoneCallResponse] =
      await Promise.all([
        ApiGenericService.find<CrmCompany>(COMPANY_ENTITY, {
          orderBy: { annualRecurringRevenue: 'DESC', name: 'ASC' },
          limit: DEFAULT_ENTITY_ITEMS_COUNT,
          relations: COMPANY_RELATIONS,
        }),
        ApiGenericService.find<CrmPerson>(PERSON_ENTITY, {
          orderBy: { lastName: 'ASC', firstName: 'ASC' },
          limit: DEFAULT_ENTITY_ITEMS_COUNT,
          relations: PERSON_RELATIONS,
        }),
        ApiGenericService.find<CrmOpportunity>(OPPORTUNITY_ENTITY, {
          orderBy: { closeDate: 'ASC', expectedRevenue: 'DESC' },
          limit: DEFAULT_ENTITY_ITEMS_COUNT,
          relations: OPPORTUNITY_RELATIONS,
        }),
        ApiGenericService.find<CrmEvent>(EVENT_ENTITY, {
          orderBy: { startDate: 'DESC' },
          limit: DEFAULT_ENTITY_ITEMS_COUNT,
          relations: EVENT_RELATIONS,
        }),
        ApiGenericService.find<PhoneCallItem>(PHONE_CALL_ENTITY, {
          orderBy: { createdAt: 'DESC' },
          limit: DEFAULT_ENTITY_ITEMS_COUNT,
          relations: PHONE_CALL_RELATIONS,
        }),
      ])

    companies.value = companyResponse.data
    people.value = personResponse.data
    opportunities.value = opportunityResponse.data
    events.value = eventResponse.data
    phoneCalls.value = phoneCallResponse.data
    hasLoadedOnce.value = true
  } finally {
    isLoading.value = false
  }
}

function buildFutureActivityByOpportunity(): Set<string> {
  const today = startOfDay(new Date())
  const result = new Set<string>()

  opportunities.value.forEach((opportunity) => {
    const hasFutureEvent = (opportunity.events ?? []).some((event) => {
      const startDate = parseDate(event.startDate)
      return Boolean(startDate && startOfDay(startDate) >= today)
    })

    if (hasFutureEvent && opportunity.handle != null) {
      result.add(String(opportunity.handle))
    }
  })

  events.value.forEach((event) => {
    const startDate = parseDate(event.startDate)
    const opportunityHandle = getRelationHandle(event.salesOpportunity)
    if (startDate && startOfDay(startDate) >= today && opportunityHandle != null) {
      result.add(String(opportunityHandle))
    }
  })

  return result
}

function buildLastContactByCompany(): Map<string, Date> {
  const result = new Map<string, Date>()

  phoneCalls.value.forEach((phoneCall) => {
    const entityHandle = getRelationHandle(phoneCall.entity)
    if (entityHandle !== COMPANY_ENTITY) {
      return
    }

    updateLatestDate(result, String(phoneCall.reference), parseDate(phoneCall.createdAt))
  })

  events.value.forEach((event) => {
    const eventDate = parseDate(event.endDate) ?? parseDate(event.startDate)
    if (!eventDate || eventDate > new Date()) {
      return
    }

    ;[event.assigneeCompany, event.creatorCompany].forEach((company) => {
      const handle = getRelationHandle(company)
      if (handle != null) {
        updateLatestDate(result, String(handle), eventDate)
      }
    })
  })

  people.value.forEach((person) => {
    const companyHandle = getRelationHandle(person.company)
    if (companyHandle == null || person.handle == null) {
      return
    }

    phoneCalls.value.forEach((phoneCall) => {
      if (
        getRelationHandle(phoneCall.entity) === PERSON_ENTITY &&
        String(phoneCall.reference) === String(person.handle)
      ) {
        updateLatestDate(result, String(companyHandle), parseDate(phoneCall.createdAt))
      }
    })
  })

  return result
}

function updateLatestDate(map: Map<string, Date>, key: string, value: Date | null): void {
  if (!value) {
    return
  }

  const current = map.get(key)
  if (!current || value > current) {
    map.set(key, value)
  }
}

function applyDefaultResponsibleFilter(): void {
  if (selectedResponsibleHandle.value || currentPersonStore.person?.handle == null) {
    return
  }

  selectedResponsibleHandle.value = String(currentPersonStore.person.handle)
}

function isOpportunityOpen(opportunity: CrmOpportunity): boolean {
  if (opportunity.isActive === false) {
    return false
  }

  const resultStatus = relationObject(opportunity.resultStatus)
  if (resultStatus?.isClosed === true) {
    return false
  }

  const stage = relationObject(opportunity.type)
  return stage?.isClosed !== true
}

function isCustomerCompany(company: CrmCompany): boolean {
  const segmentHandle = String(getRelationHandle(company.segment) ?? '')
  return ['customer', 'strategic_customer'].includes(segmentHandle)
}

function isCompanyContactOverdue(company: CrmCompany): boolean {
  const lastContact = lastCompanyContact.value.get(String(company.handle))
  if (!lastContact) {
    return true
  }

  return diffInDays(startOfDay(new Date()), startOfDay(lastContact)) >= contactThresholdDays.value
}

function companyRiskScore(company: CrmCompany): number {
  let score = 0
  if (company.churnRiskReason) {
    score += 1000
  }
  if (isCompanyContactOverdue(company)) {
    score += 500
  }
  return score + companyValue(company) / 1000
}

function companyValue(company: CrmCompany): number {
  return normalizeMoney(
    company.annualRecurringRevenue ?? company.contractValue ?? company.monthlyRecurringRevenue,
  )
}

function getOpportunityUrgencyTone(opportunity: CrmOpportunity): CrmWorkspaceItem['tone'] {
  const closeDate = parseDate(opportunity.closeDate)
  if (!closeDate) {
    return 'warning'
  }

  const days = diffInDays(startOfDay(closeDate), startOfDay(new Date()))
  if (days <= 7) {
    return 'error'
  }

  return days <= 21 ? 'warning' : 'info'
}

function relationObject(value: unknown): RelationHandle | null {
  return typeof value === 'object' && value !== null ? (value as RelationHandle) : null
}

function getRelationHandle(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return relationObject(value)?.handle ?? null
}

function resolvePerson(value: unknown): CrmPerson | null {
  const handle = getRelationHandle(value)
  return handle == null
    ? null
    : (personByHandle.value.get(String(handle)) ?? (relationObject(value) as CrmPerson | null))
}

function relationLabel(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  const relation = relationObject(value)
  return relation?.title || relation?.name || ''
}

function companyLabel(value: unknown): string {
  const handle = getRelationHandle(value)
  if (handle != null) {
    const company = companyByHandle.value.get(String(handle)) ?? relationObject(value)
    return company?.name || t('crmWorkspace.noCompany')
  }

  return t('crmWorkspace.noCompany')
}

function personLabel(value: unknown): string {
  const person = resolvePerson(value)
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()
  return name || relationLabel(value) || t('crmWorkspace.noPerson')
}

function accountOwnerLabel(company: CrmCompany): string {
  return personLabel(company.accountManager) || t('crmWorkspace.noOwner')
}

function csOwnerLabel(company: CrmCompany): string {
  return personLabel(company.customerSuccessManager) || t('crmWorkspace.noOwner')
}

function opportunityOwnerLabel(opportunity: CrmOpportunity): string {
  return (
    personLabel(opportunity.assigneePerson ?? opportunity.creatorPerson) ||
    t('crmWorkspace.noOwner')
  )
}

function matchesCompanyResponsibleFilter(company: CrmCompany): boolean {
  return matchesResponsibleFilter(company.accountManager, company.customerSuccessManager)
}

function matchesOpportunityResponsibleFilter(opportunity: CrmOpportunity): boolean {
  return matchesResponsibleFilter(opportunity.assigneePerson, opportunity.creatorPerson)
}

function matchesResponsibleFilter(...values: unknown[]): boolean {
  if (!selectedResponsibleHandle.value) {
    return true
  }

  return values.some(
    (value) => String(getRelationHandle(value) ?? '') === selectedResponsibleHandle.value,
  )
}

function matchesSearch(...values: unknown[]): boolean {
  if (!normalizedSearch.value) {
    return true
  }

  return values.some((value) => normalizeText(value).includes(normalizedSearch.value))
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim().toLocaleLowerCase()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLocaleLowerCase()
  }

  return ''
}

function normalizeMoney(value: unknown): number {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizeProbability(value: unknown): number {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? Math.min(100, Math.max(0, numberValue)) : 0
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function diffInDays(left: Date, right: Date): number {
  return Math.floor((left.getTime() - right.getTime()) / 86_400_000)
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(normalizeMoney(value))
}

function formatDate(value: unknown): string {
  const date = parseDate(value)
  return date ? d(date) : t('crmWorkspace.noDate')
}

async function openOpportunityStage(stage: StageBreakdown): Promise<void> {
  const stageOpportunities = filteredOpenOpportunities.value.filter((opportunity) => {
    const opportunityStage = relationObject(opportunity.type)
    return String(opportunityStage?.handle ?? 'unknown') === stage.key
  })

  if (stageOpportunities.length === 1) {
    await openWorkspaceItem({
      id: `stage-opportunity-${stageOpportunities[0].handle}`,
      entity: OPPORTUNITY_ENTITY,
      handle: stageOpportunities[0].handle,
      title: stageOpportunities[0].title,
      subtitle: companyLabel(
        stageOpportunities[0].assigneeCompany ?? stageOpportunities[0].creatorCompany,
      ),
    })
    return
  }

  if (stage.key === 'unknown') {
    await pushAppRoute(router, `/table/${OPPORTUNITY_ENTITY}`)
    return
  }

  await openFilteredEntity(OPPORTUNITY_ENTITY, { type: { handle: stage.key } })
}

async function openSignal(signal: CrmSignal): Promise<void> {
  if (signal.key === 'noActivity') {
    activeCockpit.value = 'sales'
    if (opportunitiesWithoutNextActivityItems.value[0]) {
      await openWorkspaceItem(opportunitiesWithoutNextActivityItems.value[0])
    }
    return
  }

  if (signal.key === 'contactGaps') {
    activeCockpit.value = 'account'
    if (customersWithoutContactItems.value[0]) {
      await openWorkspaceItem(customersWithoutContactItems.value[0])
    }
    return
  }

  activeCockpit.value = 'customerSuccess'
  if (atRiskCustomerItems.value[0]) {
    await openWorkspaceItem(atRiskCustomerItems.value[0])
  }
}

async function openWorkspaceItem(item: CrmWorkspaceItem): Promise<void> {
  if (item.handle == null) {
    return
  }

  await openFilteredEntity(item.entity, { handle: item.handle })
}

async function openFilteredEntity(
  entity: CrmWorkspaceItem['entity'],
  filter: Record<string, unknown>,
): Promise<void> {
  const encodedFilter = encodeURIComponent(JSON.stringify(filter))
  await pushAppRoute(router, `/table/${entity}?filter=${encodedFilter}`)
}
</script>
