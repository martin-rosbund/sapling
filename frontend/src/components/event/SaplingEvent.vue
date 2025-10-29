<template>
      <v-skeleton-loader
      v-if="isLoading"
      elevation="12" 
      class="fill-height" 
      type="article, actions, table"/>
    <template v-else>
        <v-row class="fill-height">
            <v-col>
            <v-sheet height="600">
                <v-calendar
                ref="calendar"
                v-model="value"
                :event-color="getEventColor"
                :event-ripple="false"
                :events="events"
                color="primary"
                type="4day"
                @change="getEvents"
                @mousedown:event="startDrag"
                @mousedown:time="startTime"
                @mouseleave="cancelDrag"
                @mousemove:time="mouseMove"
                @mouseup:time="endDrag"
                >
                <template v-slot:event="{ event, timed, eventSummary }">
                    <div class="v-event-draggable">
                    <component :is="eventSummary"></component>
                    </div>
                    <div
                    v-if="timed"
                    class="v-event-drag-bottom"
                    @mousedown.stop="extendBottom(event)"
                    ></div>
                </template>
                </v-calendar>
            </v-sheet>
            </v-col>
        </v-row>     
    </template>
</template>

<script lang="ts" setup>
//#region Imports
import type { EventItem, PersonItem } from '@/entity/entity';
import { i18n } from '@/i18n';
import ApiGenericService from '@/services/api.generic.service';
import TranslationService from '@/services/translation.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { onMounted, ref, watch } from 'vue'
import { VCalendar } from 'vuetify/labs/VCalendar';
//#endregion

type CalendarItem = {
    name: string,
    color: string,
    start: number,
    end: number,
    timed: boolean,
    event: EventItem,
}
//#region Properties
const translationService = ref(new TranslationService());
const ownPerson = ref<PersonItem | null>(null);
const events = ref<CalendarItem[]>([]);
const isLoading = ref(true);

const value = ref('')
const colors = [
    '#2196F3', '#3F51B5', '#673AB7', '#00BCD4', '#4CAF50', '#FF9800', '#757575',
]
const names = [
    'Meeting', 'Holiday', 'PTO', 'Travel', 'Event', 'Birthday', 'Conference', 'Party',
]
const dragEvent = ref(null)
const dragTime = ref(null)
const createEvent = ref(null)
const createStart = ref(null)
const extendOriginal = ref(null)
//#endregion

//#region Lifecycle
onMounted(async () => {
    const currentPersonStore = useCurrentPersonStore();
    await currentPersonStore.fetchCurrentPerson();
    ownPerson.value = currentPersonStore.person;
    await loadTranslations();
});

watch(() => i18n.global.locale.value, async () => {
    await loadTranslations();
});
//#endregion

//#region Events
function getEvents({ start, end }) {
    const startDate = new Date(start.date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(end.date);
    endDate.setHours(23, 59, 59, 999);

    ApiGenericService.find<EventItem>('event', {relations: ['participants', 'm:1'], filter: { startDate: { "$lte": endDate.getTime() }, endDate: { "$gte": startDate.getTime() } }}).then(response => {
        const fetchedEvents: EventItem[] = response.data;
        const newEvents: CalendarItem[] = []
        fetchedEvents.forEach(event => {
            newEvents.push({
                name: event.title,
                color: event.type.color,
                start: new Date(event.startDate).getTime() || 0,
                end: new Date(event.endDate).getTime() || 0,
                timed: event.isAllDay == false,
                event
            })
        })
        events.value = newEvents
    })
}
//#endregion

//#region Translations
async function loadTranslations() {
  isLoading.value = true;
  await translationService.value.prepare('navigation', 'calendar', 'global', 'event');
  isLoading.value = false;
}
//#endregion

//#region Calendar
function startDrag (nativeEvent, { event, timed }) {
    if (event && timed) {
    dragEvent.value = event
    dragTime.value = null
    extendOriginal.value = null
    }
}

function startTime (nativeEvent, tms) {
    const mouse = toTime(tms)

    if (dragEvent.value && dragTime.value === null) {
    const start = dragEvent.value.start
    dragTime.value = mouse - start
    } else {
    createStart.value = roundTime(mouse)
    createEvent.value = {
        name: `Event #${events.value.length}`,
        color: rndElement(colors),
        start: createStart.value,
        end: createStart.value,
        timed: true,
    }
    events.value.push(createEvent.value)
    }
}

function extendBottom (event) {
    createEvent.value = event
    createStart.value = event.start
    extendOriginal.value = event.end
}

function mouseMove (nativeEvent, tms) {
    const mouse = toTime(tms)

    if (dragEvent.value && dragTime.value !== null) {
    const start = dragEvent.value.start
    const end = dragEvent.value.end
    const duration = end - start
    const newStartTime = mouse - dragTime.value
    const newStart = roundTime(newStartTime)
    const newEnd = newStart + duration

    dragEvent.value.start = newStart
    dragEvent.value.end = newEnd
    } else if (createEvent.value && createStart.value !== null) {
    const mouseRounded = roundTime(mouse, false)
    const min = Math.min(mouseRounded, createStart.value)
    const max = Math.max(mouseRounded, createStart.value)

    createEvent.value.start = min
    createEvent.value.end = max
    }
}

function endDrag () {
    dragTime.value = null
    dragEvent.value = null
    createEvent.value = null
    createStart.value = null
    extendOriginal.value = null
}

function cancelDrag () {
    if (createEvent.value) {
    if (extendOriginal.value) {
        createEvent.value.end = extendOriginal.value
    } else {
        const i = events.value.indexOf(createEvent.value)
        if (i !== -1) {
        events.value.splice(i, 1)
        }
    }
    }

    createEvent.value = null
    createStart.value = null
    dragTime.value = null
    dragEvent.value = null
}

function roundTime (time, down = true) {
    const roundTo = 15 // minutes
    const roundDownTime = roundTo * 60 * 1000

    return down
    ? time - time % roundDownTime
    : time + (roundDownTime - (time % roundDownTime))
}

function toTime (tms) {
    return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime()
}

function getEventColor (event) {
    const rgb = parseInt(event.color.substring(1), 16)
    const r = (rgb >> 16) & 0xFF
    const g = (rgb >> 8) & 0xFF
    const b = (rgb >> 0) & 0xFF

    return event === dragEvent.value
    ? `rgba(${r}, ${g}, ${b}, 0.7)`
    : event === createEvent.value
        ? `rgba(${r}, ${g}, ${b}, 0.7)`
        : event.color
}

function rnd (a, b) {
    return Math.floor((b - a + 1) * Math.random()) + a
}

function rndElement (arr) {
    return arr[rnd(0, arr.length - 1)]
}
//#endregion
</script>