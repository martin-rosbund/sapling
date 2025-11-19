// Import necessary modules and types
import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import type { TicketItem, EventItem } from '@/entity/entity';
import ApiService from '@/services/api.service';

export function useSaplingInbox(emit: (event: 'close') => void) {
  //#region State
  // Load translations for the inbox module
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('global', 'inbox');

  // Reactive property to control the visibility of the inbox dialog
  const dialog = ref(true);

  // Reactive properties to store tickets and tasks data
  const tickets = ref<TicketItem[]>([]);
  const tasks = ref<EventItem[]>([]);

  // Reactive properties to store filtered tickets and tasks for today and expired
  const todayTickets = ref<TicketItem[]>([]);
  const expiredTickets = ref<TicketItem[]>([]);
  const todayTasks = ref<EventItem[]>([]);
  const expiredTasks = ref<EventItem[]>([]);
  //#endregion

  //#region Lifecycle
  // Load translations and fetch tickets and tasks when the component is mounted
  onMounted(async () => {
    await loadTranslations();
    await loadTicketsAndTasks();
  });
  //#endregion

  //#region Utility Functions
  // Check if a given date is today
  function isToday(date: Date | string | null | undefined) {
    if (!date) return false;
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  // Check if a given date is expired (before today)
  function isExpired(date: Date | string | null | undefined) {
    if (!date) return false;
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return d < now && !isToday(d);
  }

  // Format a date into a readable string, optionally including time
  function formatDate(date: Date | string | null | undefined, withTime = false) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    let result = d.toLocaleDateString();
    if (withTime) {
      result += ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return result;
  }

  // Format a task's start and end dates into a readable string
  function formatTaskDate(start: Date | string | null | undefined, end: Date | string | null | undefined) {
    if (!start) return '';
    const dStart = typeof start === 'string' ? new Date(start) : start;
    const dEnd = end ? (typeof end === 'string' ? new Date(end) : end) : null;
    const sameDay = dEnd && dStart.toLocaleDateString() === dEnd.toLocaleDateString();
    const timeRange = dStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + (dEnd ? dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
    if (!dEnd || sameDay) {
      return formatDate(dStart) + ' ' + timeRange;
    }
    return formatDate(dStart) + ' ' + dStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + formatDate(dEnd) + ' ' + dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Generate a link to a specific ticket
  function getTicketLink(ticket: TicketItem) {
    return `/ticket?handle=${ticket.handle}`;
  }

  // Generate a link to a specific task
  function getTaskLink(task: EventItem) {
    return `/event?handle=${task.handle}`;
  }
  //#endregion

  //#region Data Loading
  // Fetch tickets and tasks from the API and categorize them into today and expired
  async function loadTicketsAndTasks() {
    tickets.value = await ApiService.findAll<TicketItem[]>('current/openTickets');
    tasks.value = await ApiService.findAll<EventItem[]>('current/openEvents');
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
    translationService,
    isLoading,
    dialog,
    tickets,
    tasks,
    todayTickets,
    expiredTickets,
    todayTasks,
    expiredTasks,
    loadTranslations,
    isToday,
    isExpired,
    formatDate,
    formatTaskDate,
    getTicketLink,
    getTaskLink,
    loadTicketsAndTasks,
    closeDialog,
  };
  //#endregion
}
