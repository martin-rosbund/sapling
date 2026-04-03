import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import type { TicketItem, EventItem } from '@/entity/entity';
import ApiService from '@/services/api.service';
import { formatDate, formatDateFromTo } from '@/utils/saplingFormatUtil';
import { useRouter, type RouteLocationRaw } from 'vue-router';

type CloseEmitter = (event: 'close') => void;

/**
 * Handles inbox translations, data loading and navigation for ticket and event reminders.
 */
export function useSaplingInbox(emit: CloseEmitter) {
  //#region State
  const { isLoading } = useTranslationLoader('global', 'inbox');
  const dialog = ref(true);
  const tickets = ref<TicketItem[]>([]);
  const tasks = ref<EventItem[]>([]);
  const todayTickets = ref<TicketItem[]>([]);
  const expiredTickets = ref<TicketItem[]>([]);
  const todayTasks = ref<EventItem[]>([]);
  const expiredTasks = ref<EventItem[]>([]);
  const router = useRouter();
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
    const [loadedTickets, loadedTasks] = await Promise.all([
      ApiService.findAll<TicketItem[]>('current/openTickets'),
      ApiService.findAll<EventItem[]>('current/openEvents'),
    ]);

    tickets.value = loadedTickets;
    tasks.value = loadedTasks;
    todayTickets.value = tickets.value.filter(t => isToday(t.deadlineDate));
    expiredTickets.value = tickets.value.filter(t => isExpired(t.deadlineDate));
    todayTasks.value = tasks.value.filter(t => isToday(t.startDate));
    expiredTasks.value = tasks.value.filter(t => isExpired(t.startDate));
  }
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
    expiredTasks,
    isToday,
    isExpired,
    formatDate,
    formatDateFromTo,
    getTicketRoute,
    getTaskRoute,
    openTicket,
    openTask,
    loadTicketsAndTasks,
    closeDialog,
  };
  //#endregion
}
