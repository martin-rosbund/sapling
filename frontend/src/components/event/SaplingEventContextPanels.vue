<template>
  <aside class="sapling-event-context">
    <section class="sapling-event-panel glass-panel">
      <div class="sapling-event-panel__header">
        <div>
          <p class="sapling-event-panel__eyebrow">{{ $t('navigation.person') }}</p>
          <h2 class="sapling-event-panel__title">
            {{ selectedPeoples.length }} {{ $t('global.selected') }}
          </h2>
        </div>

        <v-btn icon="mdi-filter-variant" variant="text" @click="emit('openFilter')" />
      </div>

      <div class="sapling-event-selection-chips">
        <v-chip
          v-for="person in selectedPeoplePreview"
          :key="person.handle"
          :color="person.isOwn ? 'primary' : undefined"
          :variant="person.isOwn ? 'flat' : 'outlined'"
          size="small"
        >
          {{ person.name }}
        </v-chip>

        <v-chip v-if="selectedPeopleOverflowCount > 0" size="small" variant="outlined">
          +{{ selectedPeopleOverflowCount }}
        </v-chip>

        <div v-if="selectedPeoplePreview.length === 0" class="sapling-event-panel__empty-inline">
          <v-icon size="18">mdi-account-group-outline</v-icon>
          <span>0 {{ $t('navigation.person') }}</span>
        </div>
      </div>
    </section>

    <section class="sapling-event-panel glass-panel">
      <div class="sapling-event-panel__header">
        <div>
          <p class="sapling-event-panel__eyebrow">{{ $t('navigation.event') }}</p>
          <h2 class="sapling-event-panel__title">{{ $t('event.today') }}</h2>
        </div>
      </div>

      <div v-if="upcomingEvents.length > 0" class="sapling-event-agenda-list">
        <article
          v-for="item in upcomingEvents"
          :key="item.key"
          class="sapling-event-agenda-item"
          :class="{ 'sapling-event-agenda-item--active': item.isOngoing }"
        >
          <div class="sapling-event-agenda-item__icon" :style="{ '--sapling-event-accent': item.accentColor }">
            <v-icon size="18">{{ item.icon }}</v-icon>
          </div>

          <div class="sapling-event-agenda-item__content">
            <div class="sapling-event-agenda-item__row">
              <strong>{{ item.title }}</strong>
            </div>
            <div class="sapling-event-agenda-item__row">
              <small>{{ item.timeLabel || item.dateLabel }}</small>
            </div>
            <p>{{ item.description || item.dateLabel }}</p>
            <small v-if="item.participantCount > 0">
              {{ item.participantCount }} {{ $t('navigation.person') }}
            </small>
          </div>
        </article>
      </div>

      <div v-else class="sapling-event-panel__empty-state">
        <v-icon size="26">mdi-calendar-clock-outline</v-icon>
        <strong>{{ currentCalendarViewLabel }}</strong>
        <span>{{ currentCalendarLayoutLabel }}</span>
      </div>
    </section>
  </aside>
</template>

<script lang="ts" setup>
interface SelectedPersonPreviewItem {
  handle: number;
  name: string;
  isOwn: boolean;
}

interface EventAgendaItem {
  key: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  description: string;
  participantCount: number;
  icon: string;
  accentColor: string;
  isOngoing: boolean;
}

defineProps<{
  selectedPeoples: number[];
  selectedPeoplePreview: SelectedPersonPreviewItem[];
  selectedPeopleOverflowCount: number;
  upcomingEvents: EventAgendaItem[];
  currentCalendarViewLabel: string;
  currentCalendarLayoutLabel: string;
}>();

const emit = defineEmits<{
  (event: 'openFilter'): void;
}>();
</script>

<style scoped src="@/assets/styles/SaplingCalendar.css"></style>