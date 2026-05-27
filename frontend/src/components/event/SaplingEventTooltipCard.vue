<template>
  <article class="sapling-calendar-event-tooltip-card">
    <header class="sapling-calendar-event-tooltip-card__header">
      <span class="sapling-calendar-event-tooltip-card__icon">
        <v-icon size="18">{{ eventIcon }}</v-icon>
      </span>
      <div class="sapling-calendar-event-tooltip-card__heading">
        <strong>{{ eventTitle }}</strong>
        <span>{{ timeRange }}</span>
      </div>
    </header>

    <div v-if="onlineMeetingUrl" class="sapling-calendar-event-tooltip-card__action">
      <a
        class="sapling-calendar-event-tooltip-card__meeting-link"
        :href="onlineMeetingUrl"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
        @mousedown.stop
      >
        <v-icon size="16">mdi-video-outline</v-icon>
        <span>{{ t('calendar.joinOnlineMeeting') }}</span>
      </a>
    </div>

    <div class="sapling-calendar-event-tooltip-card__sections">
      <section class="sapling-calendar-event-tooltip-card__section">
        <span class="sapling-calendar-event-tooltip-card__section-label">
          {{ t('calendar.customer') }}
        </span>
        <div class="sapling-calendar-event-tooltip-card__rows">
          <div class="sapling-calendar-event-tooltip-card__row">
            <span>{{ t('calendar.company') }}</span>
            <strong>{{ customerCompanyName }}</strong>
          </div>
          <div class="sapling-calendar-event-tooltip-card__row">
            <span>{{ t('calendar.person') }}</span>
            <strong>{{ customerPersonName }}</strong>
          </div>
        </div>
      </section>

      <section class="sapling-calendar-event-tooltip-card__section">
        <span class="sapling-calendar-event-tooltip-card__section-label">
          {{ t('calendar.responsible') }}
        </span>
        <div class="sapling-calendar-event-tooltip-card__rows">
          <div class="sapling-calendar-event-tooltip-card__row">
            <span>{{ t('calendar.company') }}</span>
            <strong>{{ responsibleCompanyName }}</strong>
          </div>
          <div class="sapling-calendar-event-tooltip-card__row">
            <span>{{ t('calendar.person') }}</span>
            <strong>{{ responsiblePersonName }}</strong>
          </div>
        </div>
      </section>

      <section class="sapling-calendar-event-tooltip-card__section">
        <span class="sapling-calendar-event-tooltip-card__section-label">
          {{ t('calendar.participants') }}
        </span>
        <div
          v-if="participantNames.length > 0"
          class="sapling-calendar-event-tooltip-card__participants"
        >
          <span
            v-for="participant in participantNames"
            :key="participant"
            class="sapling-calendar-event-tooltip-card__participant"
          >
            {{ participant }}
          </span>
        </div>
        <span v-else class="sapling-calendar-event-tooltip-card__empty">
          {{ t('calendar.noParticipants') }}
        </span>
      </section>
    </div>
  </article>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import type { EventItem } from '@/entity/entity'
import type { CalendarParticipant } from '@/composables/event/eventCalendar.utils'

type TooltipRecord = Partial<EventItem> & {
  assigneeCompany?: TooltipRelation | null
  assigneePerson?: TooltipRelation | null
  creatorCompany?: TooltipRelation | null
  creatorPerson?: TooltipRelation | null
  participants?: CalendarParticipant[]
  onlineMeetingURL?: string | null
  onlineMeetingUrl?: string | null
  online_meeting_url?: string | null
  icon?: string | null
  color?: string | null
}

type TooltipRelation = {
  handle?: number | string | null
  title?: string | null
  name?: string | null
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

const props = defineProps<{
  event: CalendarEvent
  timeRange: string
  icon: string
}>()

const { t } = useI18n()
const record = computed(() => props.event.event as TooltipRecord | undefined)
const eventIcon = computed(() => record.value?.type?.icon || record.value?.icon || props.icon)
const eventTitle = computed(
  () => record.value?.title || props.event.name || t('event.defaultTitle'),
)

const customerCompanyName = computed(() => resolveRelationName(record.value?.creatorCompany))
const customerPersonName = computed(() => resolveRelationName(record.value?.creatorPerson))
const responsibleCompanyName = computed(() => resolveRelationName(record.value?.assigneeCompany))
const responsiblePersonName = computed(() => resolveRelationName(record.value?.assigneePerson))
const onlineMeetingUrl = computed(() =>
  normalizeUrl(
    record.value?.onlineMeetingURL ??
      record.value?.onlineMeetingUrl ??
      record.value?.online_meeting_url,
  ),
)

const participantNames = computed(() =>
  normalizeNames(
    record.value?.participants?.map((participant) => resolveParticipantName(participant)),
  ),
)

function resolveParticipantName(participant: CalendarParticipant | undefined) {
  if (participant == null) {
    return null
  }

  if (typeof participant === 'number' || typeof participant === 'string') {
    const value = String(participant).trim()
    return value ? `${t('global.person')} ${value}` : null
  }

  return resolveRelationName(participant)
}

function resolveRelationName(relation: TooltipRelation | number | string | null | undefined) {
  if (relation == null) {
    return t('calendar.noValue')
  }

  if (typeof relation === 'number' || typeof relation === 'string') {
    const value = String(relation).trim()
    return value || t('calendar.noValue')
  }

  const fullName = [relation.firstName, relation.lastName].filter(Boolean).join(' ').trim()
  return (
    relation.displayName ||
    relation.title ||
    fullName ||
    relation.name ||
    relation.email ||
    (relation.handle != null ? String(relation.handle) : t('calendar.noValue'))
  )
}

function normalizeNames(names: Array<string | null | undefined> | undefined) {
  if (!names) {
    return [] as string[]
  }

  return Array.from(
    new Set(names.map((name) => name?.trim()).filter((name): name is string => Boolean(name))),
  )
}

function normalizeUrl(url: string | null | undefined) {
  const value = url?.trim()
  if (!value) {
    return null
  }

  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? parsedUrl.toString()
      : null
  } catch {
    return null
  }
}
</script>
