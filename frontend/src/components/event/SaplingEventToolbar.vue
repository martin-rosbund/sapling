<template>
  <header class="sapling-event-toolbar">
    <div class="sapling-event-toolbar__primary">
      <v-btn-group class="sapling-event-toolbar__nav" density="comfortable">
        <v-btn variant="outlined" icon="mdi-chevron-left" @click="emit('previous')" />
        <v-btn variant="tonal" @click="emit('today')">{{ $t('event.today') }}</v-btn>
        <v-btn variant="outlined" icon="mdi-chevron-right" @click="emit('next')" />
      </v-btn-group>
    </div>

    <div class="sapling-event-toolbar__secondary">
      <v-btn-toggle
        v-if="!isNarrowScreen"
        v-model="calendarViewModeModel"
        class="sapling-event-toolbar__view-toggle"
        density="comfortable"
        mandatory
      >
        <v-btn variant="outlined" value="single">{{ $t('calendar.combined') }}</v-btn>
        <v-btn variant="outlined" value="sidebyside">{{ $t('calendar.sideBySide') }}</v-btn>
      </v-btn-toggle>

      <div class="d-none d-md-flex">
        <v-btn-toggle
          v-model="calendarTypeModel"
          class="sapling-event-toolbar__type-toggle"
          density="comfortable"
          mandatory
        >
          <v-btn variant="outlined" value="day">{{ $t('calendar.day') }}</v-btn>
          <v-btn variant="outlined" value="workweek">{{ $t('calendar.workweek') }}</v-btn>
          <v-btn variant="outlined" value="week">{{ $t('calendar.week') }}</v-btn>
          <v-btn variant="outlined" value="month">{{ $t('calendar.month') }}</v-btn>
        </v-btn-toggle>
      </div>

      <div class="sapling-event-toolbar__overflow d-flex d-md-none">
        <v-menu offset-y>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-tune" variant="text" />
          </template>

          <v-list class="glass-panel">
            <v-list-item
              v-for="type in calendarTypeOptions"
              :key="type"
              @click="calendarTypeModel = type"
            >
              <v-list-item-title>{{ $t(`calendar.${type}`) }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

type CalendarType = 'workweek' | 'month' | 'day' | 'week';
type CalendarViewMode = 'single' | 'sidebyside';

const props = defineProps<{
  isNarrowScreen: boolean;
  calendarType: CalendarType;
  calendarTypeOptions: CalendarType[];
  calendarViewMode: CalendarViewMode;
}>();

const emit = defineEmits<{
  (event: 'update:calendarType', value: CalendarType): void;
  (event: 'update:calendarViewMode', value: CalendarViewMode): void;
  (event: 'previous'): void;
  (event: 'today'): void;
  (event: 'next'): void;
}>();

const calendarTypeModel = computed({
  get: () => props.calendarType,
  set: (value: CalendarType) => emit('update:calendarType', value),
});

const calendarViewModeModel = computed({
  get: () => props.calendarViewMode,
  set: (value: CalendarViewMode) => emit('update:calendarViewMode', value),
});
</script>

<style scoped src="@/assets/styles/SaplingCalendar.css"></style>