import { computed, onMounted, ref } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import type { TicketItem, EventItem } from '@/entity/entity';
import ApiService from '@/services/api.service';
import { formatDate, formatDateFromTo } from '@/utils/saplingFormatUtil';
import { useRouter, type RouteLocationRaw } from 'vue-router';

type CloseEmitter = (event: 'close') => void;
type InboxEntryKind = 'ticket' | 'event';

/**
 * Handles inbox translations, data loading and navigation for ticket and event reminders.
 */
interface InboxEntry {
  id: string;
  kind: InboxEntryKind;
  title: string;
  description: string;
  dateText: string;
  icon: string;
  accentColor?: string | null;
  contextLabel?: string;
  contextColor?: string | null;
  statusLabel?: string;
  statusColor?: string | null;
  raw: TicketItem | EventItem;
}

interface InboxGroup {
  key: InboxEntryKind;
  labelKey: 'navigation.ticket' | 'navigation.event';
  icon: string;
  count: number;
  items: InboxEntry[];
}

interface InboxSection {
  key: 'today' | 'expired';
  titleKey: 'inbox.today' | 'inbox.expired';
  subtitleKey: 'inbox.todaySummary' | 'inbox.expiredSummary';
  emptyKey: 'inbox.todayEmpty' | 'inbox.expiredEmpty';
  icon: string;
  count: number;
  groups: InboxGroup[];
  empty: boolean;
}

interface InboxSummaryCard {
  key: 'total' | 'today' | 'expired';
  labelKey: 'navigation.inbox' | 'inbox.today' | 'inbox.expired';
  icon: string;
  count: number;
  tone: 'primary' | 'info' | 'warning';
}

export function useSaplingInbox(emit: CloseEmitter) {
  //#region State
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'inbox', 'navigation');
  const dialog = ref(true);
  const isDataLoading = ref(false);
  const tickets = ref<TicketItem[]>([]);
  const tasks = ref<EventItem[]>([]);
  const todayTickets = ref<TicketItem[]>([]);
  const expiredTickets = ref<TicketItem[]>([]);
  const todayTasks = ref<EventItem[]>([]);
  const expiredTasks = ref<EventItem[]>([]);
  const router = useRouter();
  const isLoading = computed(() => isTranslationLoading.value || isDataLoading.value);
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    await loadTicketsAndTasks();
  });
  //#endregion

  //#region Utility Functions
  /**
   * Normalizes a nullable date input into a Date instance.
   */
  function toDate(date: Date | string | null | undefined): Date | null {
    if (!date) {
      return null;
    }

    const normalizedDate = typeof date === 'string' ? new Date(date) : date;
    return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
  }

  /**
   * Checks whether a date belongs to the current day.
   */
  function isToday(date: Date | string | null | undefined) {
    const d = toDate(date);
    if (!d) return false;
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  /**
   * Checks whether a date is in the past while not belonging to the current day.
   */
  function isExpired(date: Date | string | null | undefined) {
    const d = toDate(date);
    if (!d) return false;
    const now = new Date();
    return d < now && !isToday(d);
  }

  /**
   * Sorts date-like values ascending while pushing missing dates to the end.
   */
  function sortByDateAsc(left: Date | string | null | undefined, right: Date | string | null | undefined) {
    const leftTime = toDate(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = toDate(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  }

  /**
   * Builds a unified inbox entry for ticket reminders.
   */
  function createTicketEntry(ticket: TicketItem): InboxEntry {
    return {
      id: `ticket-${ticket.handle ?? ticket.title}`,
      kind: 'ticket',
      title: ticket.title,
      description: ticket.problemDescription ?? '',
      dateText: formatDate(ticket.deadlineDate),
      icon: 'mdi-ticket-confirmation-outline',
      accentColor: ticket.priority?.color ?? ticket.status.color,
      contextLabel: ticket.priority?.description,
      contextColor: ticket.priority?.color,
      statusLabel: ticket.status.description,
      statusColor: ticket.status.color,
      raw: ticket,
    };
  }

  /**
   * Builds a unified inbox entry for event reminders.
   */
  function createTaskEntry(task: EventItem): InboxEntry {
    return {
      id: `event-${task.handle ?? task.title}`,
      kind: 'event',
      title: task.title,
      description: task.description ?? '',
      dateText: formatDateFromTo(task.startDate, task.endDate),
      icon: task.type?.icon || 'mdi-calendar-clock-outline',
      accentColor: task.type?.color ?? task.status.color,
      contextLabel: task.type?.title,
      contextColor: task.type?.color,
      statusLabel: task.status.description,
      statusColor: task.status.color,
      raw: task,
    };
  }

  /**
   * Opens an inbox entry by its underlying entity type.
   */
  async function openEntry(entry: InboxEntry) {
    if (entry.kind === 'ticket') {
      await openTicket(entry.raw as TicketItem);
      return;
    }

    await openTask(entry.raw as EventItem);
  }

  /**
   * Creates the route location for a ticket reminder entry.
   */
  function getTicketRoute(ticket: TicketItem): RouteLocationRaw {
    return {
      path: '/table/ticket',
      query: {
        filter: JSON.stringify({ handle: ticket.handle }),
      },
    };
  }

  /**
   * Creates the route location for an event reminder entry.
   */
  function getTaskRoute(task: EventItem): RouteLocationRaw {
    return {
      path: '/table/event',
      query: {
        filter: JSON.stringify({ handle: task.handle }),
      },
    };
  }

  /**
   * Closes the inbox and opens the selected ticket.
   */
  async function openTicket(ticket: TicketItem) {
    closeDialog();
    await router.push(getTicketRoute(ticket));
  }

  /**
   * Closes the inbox and opens the selected event.
   */
  async function openTask(task: EventItem) {
    closeDialog();
    await router.push(getTaskRoute(task));
  }
  //#endregion

  //#region Data Loading
  /**
   * Fetches all open inbox items and derives the date-based buckets used in the view.
   */
  async function loadTicketsAndTasks() {
    isDataLoading.value = true;

    try {
      const [loadedTickets, loadedTasks] = await Promise.all([
        ApiService.findAll<TicketItem[]>('current/openTickets'),
        ApiService.findAll<EventItem[]>('current/openEvents'),
      ]);

      tickets.value = loadedTickets;
      tasks.value = loadedTasks;
      todayTickets.value = tickets.value
        .filter(t => isToday(t.deadlineDate))
        .sort((left, right) => sortByDateAsc(left.deadlineDate, right.deadlineDate));
      expiredTickets.value = tickets.value
        .filter(t => isExpired(t.deadlineDate))
        .sort((left, right) => sortByDateAsc(left.deadlineDate, right.deadlineDate));
      todayTasks.value = tasks.value
        .filter(t => isToday(t.startDate))
        .sort((left, right) => sortByDateAsc(left.startDate, right.startDate));
      expiredTasks.value = tasks.value
        .filter(t => isExpired(t.startDate))
        .sort((left, right) => sortByDateAsc(left.startDate, right.startDate));
    } finally {
      isDataLoading.value = false;
    }
  }
  //#endregion

  //#region Derived State
  const ticketEntries = computed(() => tickets.value.map(createTicketEntry));
  const taskEntries = computed(() => tasks.value.map(createTaskEntry));
  const todayTicketEntries = computed(() => todayTickets.value.map(createTicketEntry));
  const expiredTicketEntries = computed(() => expiredTickets.value.map(createTicketEntry));
  const todayTaskEntries = computed(() => todayTasks.value.map(createTaskEntry));
  const expiredTaskEntries = computed(() => expiredTasks.value.map(createTaskEntry));
  const totalEntries = computed(() => ticketEntries.value.length + taskEntries.value.length);
  const hasInboxItems = computed(() => totalEntries.value > 0);
  const summaryCards = computed<InboxSummaryCard[]>(() => [
    {
      key: 'total',
      labelKey: 'navigation.inbox',
      icon: 'mdi-inbox-multiple-outline',
      count: totalEntries.value,
      tone: 'primary',
    },
    {
      key: 'today',
      labelKey: 'inbox.today',
      icon: 'mdi-calendar-today',
      count: todayTicketEntries.value.length + todayTaskEntries.value.length,
      tone: 'info',
    },
    {
      key: 'expired',
      labelKey: 'inbox.expired',
      icon: 'mdi-alert-circle-outline',
      count: expiredTicketEntries.value.length + expiredTaskEntries.value.length,
      tone: 'warning',
    },
  ]);
  const sections = computed<InboxSection[]>(() => [
    {
      key: 'today',
      titleKey: 'inbox.today',
      subtitleKey: 'inbox.todaySummary',
      emptyKey: 'inbox.todayEmpty',
      icon: 'mdi-calendar-today',
      count: todayTicketEntries.value.length + todayTaskEntries.value.length,
      empty: todayTicketEntries.value.length + todayTaskEntries.value.length === 0,
      groups: [
        {
          key: 'ticket',
          labelKey: 'navigation.ticket',
          icon: 'mdi-ticket-confirmation-outline',
          count: todayTicketEntries.value.length,
          items: todayTicketEntries.value,
        },
        {
          key: 'event',
          labelKey: 'navigation.event',
          icon: 'mdi-calendar-clock-outline',
          count: todayTaskEntries.value.length,
          items: todayTaskEntries.value,
        },
      ],
    },
    {
      key: 'expired',
      titleKey: 'inbox.expired',
      subtitleKey: 'inbox.expiredSummary',
      emptyKey: 'inbox.expiredEmpty',
      icon: 'mdi-alert-circle-outline',
      count: expiredTicketEntries.value.length + expiredTaskEntries.value.length,
      empty: expiredTicketEntries.value.length + expiredTaskEntries.value.length === 0,
      groups: [
        {
          key: 'ticket',
          labelKey: 'navigation.ticket',
          icon: 'mdi-ticket-confirmation-outline',
          count: expiredTicketEntries.value.length,
          items: expiredTicketEntries.value,
        },
        {
          key: 'event',
          labelKey: 'navigation.event',
          icon: 'mdi-calendar-clock-outline',
          count: expiredTaskEntries.value.length,
          items: expiredTaskEntries.value,
        },
      ],
    },
  ]);
  //#endregion

  //#region Dialog Management
  // Close the inbox dialog and emit a close event
  function closeDialog() {
    dialog.value = false;
    emit('close');
  }
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    isLoading,
    dialog,
    tickets,
    tasks,
    todayTickets,
    expiredTickets,
    todayTasks,
    ticketEntries,
    taskEntries,
    totalEntries,
    hasInboxItems,
    summaryCards,
    sections,
    expiredTasks,
    isToday,
    isExpired,
    formatDate,
    formatDateFromTo,
    getTicketRoute,
    getTaskRoute,
    openEntry,
    openTicket,
    openTask,
    loadTicketsAndTasks,
    closeDialog,
  };
  //#endregion
}
