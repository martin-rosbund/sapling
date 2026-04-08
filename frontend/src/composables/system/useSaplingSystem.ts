import { ref, onMounted, onUnmounted } from 'vue';
import ApiService from '@/services/api.service';
import { useTranslationLoader } from '../generic/useTranslationLoader';
import type {
  ApplicationState,
  ApplicationVersion,
  Cpu,
  CpuSpeed,
  Filesystem,
  Memory,
  NetworkInterface,
  OperatingSystem,
  Time,
} from '@/entity/system';

const SYSTEM_ERROR_KEY = 'global.errorOnLoading';
const GIGABYTE = 1073741824;
const MEGABYTE = 1048576;
const KILOBYTE = 1024;

/**
 * Provides all state and helper functions for the system dashboard.
 */
export function useSaplingSystem() {
  //#region State
  const cpu = ref<Cpu | null>(null);
  const cpuLoading = ref(true);
  const cpuError = ref<string | null>(null);

  const cpuSpeed = ref<CpuSpeed | null>(null);
  const cpuSpeedLoading = ref(true);
  const cpuSpeedError = ref<string | null>(null);

  const memory = ref<Memory | null>(null);
  const memoryLoading = ref(true);
  const memoryError = ref<string | null>(null);

  const filesystem = ref<Filesystem[]>([]);
  const filesystemLoading = ref(true);
  const filesystemError = ref<string | null>(null);

  const os = ref<OperatingSystem | null>(null);
  const osLoading = ref(true);
  const osError = ref<string | null>(null);

  const state = ref<ApplicationState| null>(null);
  const stateLoading = ref(true);
  const stateError = ref<string | null>(null);

  const time = ref<Time | null>(null);
  const timeLoading = ref(true);
  const timeError = ref<string | null>(null);

  const version = ref<ApplicationVersion | null>(null);
  const versionLoading = ref(true);
  const versionError = ref<string | null>(null);

  const network = ref<NetworkInterface[]>([]);
  const networkLoading = ref(true);
  const networkError = ref<string | null>(null);

  const lastUpdated = ref<Date | null>(null);

  let interval: number = 0;
  const POLL_INTERVAL = 3000;
  
  const { translationService, isLoading } = useTranslationLoader('global','system');
  //#endregion

  //#region Fetch Functions
  /**
   * Loads a system endpoint into the provided refs with consistent error handling.
   */
  async function executeSystemRequest<T>(
    endpoint: string,
    target: { value: T },
    loading: { value: boolean },
    error: { value: string | null },
    options?: { preserveLoading?: boolean },
  ) {
    if (!options?.preserveLoading) {
      loading.value = true;
    }

    error.value = null;

    try {
      target.value = await ApiService.findOne<T>(endpoint);
    } catch {
      error.value = SYSTEM_ERROR_KEY;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCpu() {
    await executeSystemRequest('system/cpu', cpu, cpuLoading, cpuError);
  }

  async function fetchCpuSpeed() {
    await executeSystemRequest('system/cpu/speed', cpuSpeed, cpuSpeedLoading, cpuSpeedError, { preserveLoading: true });
  }

  async function fetchMemory() {
    await executeSystemRequest('system/memory', memory, memoryLoading, memoryError);
  }

  async function fetchFilesystem() {
    await executeSystemRequest('system/filesystem', filesystem, filesystemLoading, filesystemError);
  }

  async function fetchOs() {
    await executeSystemRequest('system/os', os, osLoading, osError);
  }

  async function fetchNetwork() {
    await executeSystemRequest('system/network', network, networkLoading, networkError);
  }

  async function fetchState() {
    await executeSystemRequest('system/state', state, stateLoading, stateError);
  }

  async function fetchTime() {
    await executeSystemRequest('system/time', time, timeLoading, timeError, { preserveLoading: true });
  }

  async function fetchVersion() {
    await executeSystemRequest('system/version', version, versionLoading, versionError);
  }
  //#endregion

  //#region Polling Setup
  async function fetchAll() {
    await Promise.all([
      fetchCpu(),
      fetchCpuSpeed(),
      fetchMemory(),
      fetchFilesystem(),
      fetchOs(),
      fetchState(),
      fetchTime(),
      fetchVersion(),
      fetchNetwork(),
    ]);

    lastUpdated.value = new Date();
  }

  async function fetchNonPersistent() {
    await Promise.all([
      fetchCpuSpeed(),
      fetchTime(),
    ]);

    lastUpdated.value = new Date();
  }

  onMounted(async () => {
    await fetchAll();
    interval = window.setInterval(fetchNonPersistent, POLL_INTERVAL);
  });

  onUnmounted(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
  //#endregion

  //#region Formatters
  /**
   * Formats raw bytes as gigabytes with one decimal place.
   */
  function formatGigabytes(value: number) {
    return `${(value / GIGABYTE).toFixed(1)} GB`;
  }

  /**
   * Formats raw bytes as megabytes with one decimal place.
   */
  function formatMegabytes(value: number) {
    return `${(value / MEGABYTE).toFixed(1)} MB`;
  }

  function formatBytes(value: number) {
    if (!Number.isFinite(value)) {
      return '0 B';
    }

    if (value >= GIGABYTE) {
      return `${(value / GIGABYTE).toFixed(1)} GB`;
    }

    if (value >= MEGABYTE) {
      return `${(value / MEGABYTE).toFixed(1)} MB`;
    }

    if (value >= KILOBYTE) {
      return `${(value / KILOBYTE).toFixed(1)} kB`;
    }

    return `${value.toFixed(0)} B`;
  }

  /**
   * Formats raw bytes-per-second as kilobytes per second.
   */
  function formatKilobytesPerSecond(value: number) {
    return `${(value / KILOBYTE).toFixed(1)} kB/s`;
  }

  function formatBytesPerSecond(value: number) {
    return `${formatBytes(value)}/s`;
  }

  /**
   * Formats a percentage with one decimal place.
   */
  function formatPercentage(value: number) {
    return `${value.toFixed(1)}%`;
  }

  function formatDateTime(value: string | number | null | undefined) {
    if (value == null || value === '') {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function formatUptime(value: string | number | null | undefined) {
    if (value == null || value === '') {
      return '-';
    }

    if (typeof value === 'string' && Number.isNaN(Number(value))) {
      return value;
    }

    const totalSeconds = Number(value);

    if (!Number.isFinite(totalSeconds)) {
      return String(value);
    }

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (hours > 0 || days > 0) {
      parts.push(`${hours}h`);
    }

    parts.push(`${minutes}m`);

    return parts.join(' ');
  }
  //#endregion

  //#region Return
  return {
    cpu, cpuLoading, cpuError,
    cpuSpeed, cpuSpeedLoading, cpuSpeedError,
    memory, memoryLoading, memoryError,
    filesystem, filesystemLoading, filesystemError,
    os, osLoading, osError,
    state, stateLoading, stateError,
    time, timeLoading, timeError,
    version, versionLoading, versionError,
    network, networkLoading, networkError,
    lastUpdated,
    translationService, isLoading,
    fetchAll,
    formatGigabytes,
    formatMegabytes,
    formatBytes,
    formatBytesPerSecond,
    formatKilobytesPerSecond,
    formatPercentage,
    formatDateTime,
    formatUptime,
  };
  //#endregion
}