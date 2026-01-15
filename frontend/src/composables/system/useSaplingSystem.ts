import { ref, onMounted, onUnmounted } from 'vue';
import ApiService from '@/services/api.service';
import { useTranslationLoader } from '../generic/useTranslationLoader';
import type { ApplicationState, Cpu, CpuSpeed, Filesystem, Memory, NetworkInterface, OperatingSystem } from '@/entity/system';

export function useSaplingSystem() {

  // State
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

  const network = ref<NetworkInterface[]>([]);
  const networkLoading = ref(true);
  const networkError = ref<string | null>(null);

  // Polling Interval
  let interval: number = 0;
  const POLL_INTERVAL = 3000;
  
  const { translationService, isLoading } = useTranslationLoader('global','system');

  // Fetch Functions
  async function fetchCpu() {
    cpuLoading.value = true;
    cpuError.value = null;
    try {
      cpu.value = await ApiService.findOne('system/cpu');
    } catch {
      cpuError.value = 'global.errorOnLoading';
    } finally {
      cpuLoading.value = false;
    }
  }
  async function fetchCpuSpeed() {
    //cpuSpeedLoading.value = true;
    cpuSpeedError.value = null;
    try {
      cpuSpeed.value = await ApiService.findOne('system/cpu/speed');
    } catch {
      cpuSpeedError.value = 'global.errorOnLoading';
    } finally {
      cpuSpeedLoading.value = false;
    }
  }
  async function fetchMemory() {
    memoryLoading.value = true;
    memoryError.value = null;
    try {
      memory.value = await ApiService.findOne('system/memory');
    } catch {
      memoryError.value = 'global.errorOnLoading';
    } finally {
      memoryLoading.value = false;
    }
  }
  async function fetchFilesystem() {
    filesystemLoading.value = true;
    filesystemError.value = null;
    try {
      filesystem.value = await ApiService.findOne('system/filesystem');
    } catch {
      filesystemError.value = 'global.errorOnLoading';
    } finally {
      filesystemLoading.value = false;
    }
  }
  async function fetchOs() {
    osLoading.value = true;
    osError.value = null;
    try {
      os.value = await ApiService.findOne('system/os');
    } catch {
      osError.value = 'global.errorOnLoading';
    } finally {
      osLoading.value = false;
    }
  }

  async function fetchNetwork() {
    networkLoading.value = true;
    networkError.value = null;
    try {
      network.value = await ApiService.findOne('system/network');
    } catch {
      networkError.value = 'global.errorOnLoading';
    } finally {
      networkLoading.value = false;
    }
  }

  async function fetchState() {
    stateLoading.value = true;
    stateError.value = null;
    try {
      state.value = await ApiService.findOne('system/state');
    } catch {
      stateError.value = 'global.errorOnLoading';
    } finally {
      stateLoading.value = false;
    }
  }

  // Polling Setup
  async function fetchAll() {
    await Promise.all([
      fetchCpu(),
      fetchCpuSpeed(),
      fetchMemory(),
      fetchFilesystem(),
      fetchOs(),
      fetchState(),
      fetchNetwork(),
    ]);
  }

  async function fetchNonPersistent() {
    await Promise.all([
      fetchCpuSpeed()
    ]);
  }

  onMounted(() => {
    fetchAll();
    interval = setInterval(fetchNonPersistent, POLL_INTERVAL);
  });
  onUnmounted(() => {
    if (interval) clearInterval(interval);
  });

  // Return
  return {
    cpu, cpuLoading, cpuError,
    cpuSpeed, cpuSpeedLoading, cpuSpeedError,
    memory, memoryLoading, memoryError,
    filesystem, filesystemLoading, filesystemError,
    os, osLoading, osError,
    state, stateLoading, stateError,
    network, networkLoading, networkError,
    translationService, isLoading,
    fetchAll
  };
  
}