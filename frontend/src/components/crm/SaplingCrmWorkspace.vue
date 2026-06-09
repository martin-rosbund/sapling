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

    <section class="sapling-crm-workspace__toolbar glass-panel">
      <v-btn-toggle
        v-model="activeCockpit"
        class="sapling-crm-workspace__tabs"
        color="primary"
        density="comfortable"
        divided
        mandatory
      >
        <v-btn value="sales" prepend-icon="mdi-chart-timeline-variant">
          {{ t('crmWorkspace.salesCockpit') }}
        </v-btn>
        <v-btn value="account" prepend-icon="mdi-domain">
          {{ t('crmWorkspace.accountCockpit') }}
        </v-btn>
        <v-btn value="customerSuccess" prepend-icon="mdi-heart-pulse">
          {{ t('crmWorkspace.customerSuccessCockpit') }}
        </v-btn>
      </v-btn-toggle>

      <div class="sapling-crm-workspace__toolbar-fields">
        <v-text-field
          v-model="search"
          density="comfortable"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          :label="t('global.search')"
        />
        <v-select
          v-model="contactThresholdDays"
          density="comfortable"
          hide-details
          :items="contactThresholdOptions"
          :label="t('crmWorkspace.contactThreshold')"
        />
      </div>
    </section>

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
            <article
              v-for="stage in salesStageBreakdown"
              :key="stage.key"
              class="sapling-crm-stage"
              :style="{ '--sapling-crm-stage-color': stage.color }"
            >
              <div class="sapling-crm-stage__bar" />
              <span>{{ stage.label }}</span>
              <strong>{{ stage.count }}</strong>
              <small>{{ formatMoney(stage.value) }}</small>
            </article>
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

        <section class="sapling-crm-workspace-panel sapling-crm-workspace-panel--compact glass-panel">
          <header class="sapling-crm-workspace-panel__header">
            <div>
              <p class="sapling-eyebrow">{{ t('crmWorkspace.signalOverview') }}</p>
              <h2>{{ t('crmWorkspace.pipelineHealth') }}</h2>
            </div>
          </header>

          <div class="sapling-crm-signal-list">
            <article v-for="signal in signals" :key="signal.key" class="sapling-crm-signal">
              <v-icon :icon="signal.icon" size="18" />
              <span>{{ signal.label }}</span>
              <strong>{{ signal.value }}</strong>
            </article>
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
import { useGenericStore } from '@/stores/genericStore'
import { pushAppRoute } from '@/utils/routerNavigation'

type CockpitKey = 'sales' | 'account' | 'customerSuccess'

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
const PERSON_RELATIONS = ['company', 'salutation', 'title', 'jobTitle', 'jobFunction', 'decisionRole']
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

const activeCockpit = ref<CockpitKey>('sales')
const contactThresholdDays = ref(45)
const search = ref('')
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
  companies.value.filter((company) => matchesSearch(company.name, relationLabel(company.segment))),
)
const openOpportunities = computed(() => opportunities.value.filter(isOpportunityOpen))
const filteredOpenOpportunities = computed(() =>
  openOpportunities.value.filter((opportunity) =>
    matchesSearch(
      opportunity.title,
      opportunity.nextStep,
      companyLabel(opportunity.assigneeCompany ?? opportunity.creatorCompany),
      personLabel(opportunity.assigneePerson ?? opportunity.creatorPerson),
    ),
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
    .sort((left, right) => right.days - left.days || companyValue(right.company) - companyValue(left.company))
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
      return leftDate - rightDate || normalizeMoney(right.expectedRevenue) - normalizeMoney(left.expectedRevenue)
    }),
)

const customersWithoutContactItems = computed<CrmWorkspaceItem[]>(() =>
  customersWithoutContact.value.slice(0, 12).map(({ company, days }) => ({
    id: `company-contact-${company.handle}`,
    entity: COMPANY_ENTITY,
    handle: company.handle,
    title: company.name,
    subtitle: accountOwnerLabel(company),
    value: Number.isFinite(days) ? t('crmWorkspace.daysAgo', { count: days }) : t('crmWorkspace.noContact'),
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
    value: formatMoney(opportunity.expectedRevenue),
    badge: formatDate(opportunity.closeDate),
    tone: getOpportunityUrgencyTone(opportunity),
    icon: 'mdi-calendar-alert-outline',
  })),
)

const atRiskCustomerItems = computed<CrmWorkspaceItem[]>(() =>
  filteredCompanies.value
    .filter((company) => isCustomerCompany(company) && (company.churnRiskReason || isCompanyContactOverdue(company)))
    .sort((left, right) => companyRiskScore(right) - companyRiskScore(left))
    .slice(0, 12)
    .map((company) => ({
      id: `company-risk-${company.handle}`,
      entity: COMPANY_ENTITY,
      handle: company.handle,
      title: company.name,
      subtitle: relationLabel(company.churnRiskReason) || t('crmWorkspace.contactRisk'),
      value: formatMoney(company.annualRecurringRevenue ?? company.contractValue),
      badge: csOwnerLabel(company),
      tone: company.churnRiskReason ? 'error' : 'warning',
      icon: 'mdi-alert-decagram-outline',
    })),
)

const todayContactItems = computed<CrmWorkspaceItem[]>(() => {
  const urgentOpportunityItems = opportunitiesWithoutNextActivity.value.slice(0, 7).map((opportunity) => {
    const person = resolvePerson(opportunity.assigneePerson ?? opportunity.creatorPerson)
    return {
      id: `contact-opportunity-${opportunity.handle}`,
      entity: person?.handle ? PERSON_ENTITY : OPPORTUNITY_ENTITY,
      handle: person?.handle ?? opportunity.handle,
      title: person ? personLabel(person) : opportunity.title,
      subtitle: companyLabel(opportunity.assigneeCompany ?? opportunity.creatorCompany),
      value: formatMoney(opportunity.expectedRevenue),
      badge: t('crmWorkspace.noNextActivity'),
      tone: getOpportunityUrgencyTone(opportunity),
      icon: 'mdi-phone-outgoing-outline',
    } satisfies CrmWorkspaceItem
  })

  const accountItems = customersWithoutContact.value.slice(0, 7).map(({ company, days }) => ({
    id: `contact-account-${company.handle}`,
    entity: COMPANY_ENTITY,
    handle: company.handle,
    title: company.name,
    subtitle: accountOwnerLabel(company),
    value: Number.isFinite(days) ? t('crmWorkspace.daysAgo', { count: days }) : t('crmWorkspace.noContact'),
    badge: t('crmWorkspace.customerContactGap'),
    tone: days >= 90 ? 'error' : 'warning',
    icon: 'mdi-phone-sync-outline',
  }) satisfies CrmWorkspaceItem)

  return [...urgentOpportunityItems, ...accountItems]
    .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.id === item.id) === index)
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
      subtitle: [relationLabel(company.industry), accountOwnerLabel(company)]
        .filter(Boolean)
        .join(' | '),
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
  filteredOpenOpportunities.value.reduce((sum, opportunity) => sum + normalizeMoney(opportunity.expectedRevenue), 0),
)
const weightedPipelineValue = computed(() =>
  filteredOpenOpportunities.value.reduce(
    (sum, opportunity) =>
      sum + normalizeMoney(opportunity.expectedRevenue) * (normalizeProbability(opportunity.probability) / 100),
    0,
  ),
)
const totalArr = computed(() =>
  filteredCompanies.value.reduce((sum, company) => sum + normalizeMoney(company.annualRecurringRevenue), 0),
)
const riskCustomerCount = computed(() => atRiskCustomerItems.value.length)

const heroMetrics = computed(() => [
  { key: 'openPipeline', label: t('crmWorkspace.openPipeline'), value: formatMoney(openPipelineValue.value) },
  { key: 'weightedPipeline', label: t('crmWorkspace.weightedPipeline'), value: formatMoney(weightedPipelineValue.value) },
  { key: 'totalArr', label: t('crmWorkspace.totalArr'), value: formatMoney(totalArr.value) },
  { key: 'contactToday', label: t('crmWorkspace.contactToday'), value: n(todayContactItems.value.length) },
])

const signals = computed(() => [
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
  await genericStore.loadGenericMany([
    { entityHandle: COMPANY_ENTITY, namespaces: ['global', 'navigation', 'crmWorkspace'] },
    { entityHandle: PERSON_ENTITY, namespaces: ['global', 'navigation', 'crmWorkspace'] },
    { entityHandle: OPPORTUNITY_ENTITY, namespaces: ['global', 'navigation', 'crmWorkspace'] },
  ])
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
      if (getRelationHandle(phoneCall.entity) === PERSON_ENTITY && String(phoneCall.reference) === String(person.handle)) {
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
  return normalizeMoney(company.annualRecurringRevenue ?? company.contractValue ?? company.monthlyRecurringRevenue)
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
  return handle == null ? null : personByHandle.value.get(String(handle)) ?? (relationObject(value) as CrmPerson | null)
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

async function openWorkspaceItem(item: CrmWorkspaceItem): Promise<void> {
  if (item.handle == null) {
    return
  }

  const filter = encodeURIComponent(JSON.stringify({ handle: item.handle }))
  await pushAppRoute(router, `/table/${item.entity}?filter=${filter}`)
}
</script>

<style scoped>
.sapling-crm-workspace {
  --crm-border: rgba(255, 255, 255, 0.13);
  --crm-muted: rgba(229, 236, 255, 0.68);
  --crm-panel: rgba(15, 22, 38, 0.68);
  --crm-panel-strong: rgba(17, 24, 39, 0.82);
  --crm-soft: rgba(255, 255, 255, 0.065);
  gap: 14px;
}

.sapling-crm-workspace__hero {
  min-height: auto;
}

.sapling-crm-workspace__hero :deep(.sapling-page-hero__content) {
  min-height: 190px;
  padding-block: 22px;
}

.sapling-crm-workspace__hero :deep(.sapling-page-hero__title) {
  font-size: clamp(2.15rem, 4vw, 3.25rem);
  line-height: 1.05;
}

.sapling-crm-workspace__hero :deep(.sapling-page-hero__eyebrow) {
  margin-bottom: 8px;
}

.sapling-crm-workspace__subtitle {
  max-width: 760px;
  margin: 0;
  color: var(--crm-muted);
}

.sapling-crm-workspace__hero-side {
  display: grid;
  grid-template-columns: repeat(2, minmax(130px, 1fr));
  gap: 10px;
  min-width: min(420px, 100%);
}

.sapling-crm-workspace-metric {
  display: grid;
  gap: 4px;
  min-height: 68px;
  padding: 12px 14px;
  border: 1px solid var(--crm-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
}

.sapling-crm-workspace-metric span {
  color: var(--crm-muted);
  font-size: 0.78rem;
}

.sapling-crm-workspace-metric strong {
  font-size: 1.2rem;
  line-height: 1.2;
}

.sapling-crm-workspace__refresh {
  grid-column: 1 / -1;
  justify-self: end;
}

.sapling-crm-workspace__toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  background: var(--crm-panel-strong);
}

.sapling-crm-workspace__tabs {
  flex: 0 0 auto;
}

.sapling-crm-workspace__tabs :deep(.v-btn) {
  min-height: 40px;
  background: rgba(255, 255, 255, 0.04);
  letter-spacing: 0;
}

.sapling-crm-workspace__tabs :deep(.v-btn--active) {
  background: rgba(var(--v-theme-primary), 0.92);
}

.sapling-crm-workspace__toolbar-fields {
  display: grid;
  grid-template-columns: minmax(220px, 360px) minmax(180px, 220px);
  gap: 12px;
  align-items: center;
  width: min(620px, 100%);
}

.sapling-crm-workspace__progress {
  margin-block: 12px;
  border-radius: 999px;
}

.sapling-crm-workspace__loading-grid,
.sapling-crm-workspace__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 18px;
}

.sapling-crm-workspace__loading-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.sapling-crm-workspace__main,
.sapling-crm-workspace__side {
  display: grid;
  gap: 18px;
  align-content: start;
}

.sapling-crm-workspace-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 8px;
  background: var(--crm-panel);
}

.sapling-crm-workspace-panel--compact {
  gap: 12px;
}

.sapling-crm-workspace-panel__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.sapling-crm-workspace-panel__header h2 {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.25;
}

.sapling-crm-workspace__stage-grid,
.sapling-crm-account-grid {
  display: grid;
  gap: 12px;
}

.sapling-crm-workspace__stage-grid {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}

.sapling-crm-account-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
}

.sapling-crm-stage,
.sapling-crm-account-card,
.sapling-crm-signal {
  border: 1px solid var(--crm-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
}

.sapling-crm-stage {
  position: relative;
  display: grid;
  gap: 5px;
  padding: 14px;
  overflow: hidden;
}

.sapling-crm-stage__bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--sapling-crm-stage-color);
}

.sapling-crm-stage span,
.sapling-crm-stage small,
.sapling-crm-account-card__meta {
  color: var(--crm-muted);
}

.sapling-crm-stage strong {
  font-size: 1.45rem;
}

.sapling-crm-account-card {
  width: 100%;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.sapling-crm-account-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  min-height: 148px;
  padding: 16px;
}

.sapling-crm-account-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.45);
  background: rgba(var(--v-theme-primary), 0.1);
}

.sapling-crm-account-card__title {
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.sapling-crm-account-card__meta {
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.sapling-crm-account-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
}

.sapling-crm-account-card__badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  min-height: 22px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
  font-size: 0.74rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.sapling-crm-account-card__footer strong {
  line-height: 1.2;
  white-space: nowrap;
}

.sapling-crm-signal-list {
  display: grid;
  gap: 8px;
}

.sapling-crm-signal {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
}

.sapling-crm-signal span {
  color: var(--crm-muted);
}

@media (max-width: 1200px) {
  .sapling-crm-workspace__layout {
    grid-template-columns: 1fr;
  }

  .sapling-crm-workspace__side {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (max-width: 900px) {
  .sapling-crm-workspace__toolbar,
  .sapling-crm-workspace__toolbar-fields {
    grid-template-columns: 1fr;
  }

  .sapling-crm-workspace__toolbar {
    display: grid;
  }

  .sapling-crm-workspace__tabs {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
