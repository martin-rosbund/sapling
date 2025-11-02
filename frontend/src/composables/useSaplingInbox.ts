import { ref, onMounted, watch } from 'vue';
import type { TicketItem, EventItem } from '@/entity/entity';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';

export function useSaplingInbox(emit: (event: 'close') => void) {
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);
  const dialog = ref(true);
  const tickets = ref<TicketItem[]>([]);
  const tasks = ref<EventItem[]>([]);
  const todayTickets = ref<TicketItem[]>([]);
  const expiredTickets = ref<TicketItem[]>([]);
  const todayTasks = ref<EventItem[]>([]);
  const expiredTasks = ref<EventItem[]>([]);

  onMounted(async () => {
    await loadTranslations();
    await loadTicketsAndTasks();
  });

  watch(() => i18n.global.locale.value, async () => {
    await loadTranslations();
  });

  async function loadTranslations() {
    isLoading.value = true;
    await translationService.value.prepare('global', 'inbox');
    isLoading.value = false;
  }

  function isToday(date: Date | string | null | undefined) {
    if (!date) return false;
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  function isExpired(date: Date | string | null | undefined) {
    if (!date) return false;
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return d < now && !isToday(d);
  }

  function formatDate(date: Date | string | null | undefined, withTime = false) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    let result = d.toLocaleDateString();
    if (withTime) {
      result += ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return result;
  }

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

  function getTicketLink(ticket: TicketItem) {
    return `/ticket?handle=${ticket.handle}`;
  }
  function getTaskLink(task: EventItem) {
    return `/calendar?handle=${task.handle}`;
  }

  async function loadTicketsAndTasks() {
    tickets.value = await ApiService.findAll<TicketItem[]>('current/openTickets');
    tasks.value = await ApiService.findAll<EventItem[]>('current/openEvents');
    todayTickets.value = tickets.value.filter(t => isToday(t.deadlineDate));
    expiredTickets.value = tickets.value.filter(t => isExpired(t.deadlineDate));
    todayTasks.value = tasks.value.filter(t => isToday(t.startDate));
    expiredTasks.value = tasks.value.filter(t => isExpired(t.startDate));
  }

  function closeDialog() {
    dialog.value = false;
    emit('close');
  }

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
}
